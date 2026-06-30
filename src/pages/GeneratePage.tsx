import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import Grid from '@mui/material/Grid';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Snackbar from '@mui/material/Snackbar';
import DownloadIcon from '@mui/icons-material/Download';
import FolderZipIcon from '@mui/icons-material/FolderZip';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import TableChartIcon from '@mui/icons-material/TableChart';
import OutputIcon from '@mui/icons-material/Output';
import type { DraftConfig } from '../types';
import { SHEET_TABS } from '../constants';
import { downloadXlsx, downloadCsvZip, getFilenameBase } from '../xlsxGenerator';
import { buildAdsScript } from '../adsScriptTemplate';
import { buildBridgeScript } from '../bridgeScriptTemplate';

interface Props {
  config: DraftConfig;
}

interface ValidationResult {
  errors: string[];
  warnings: string[];
}

function validate(cfg: DraftConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!cfg.customerId) errors.push('กรุณาระบุ Customer ID');
  if (!cfg.accountNickname) errors.push('กรุณาระบุชื่อย่อบัญชี (Nickname)');
  if (!cfg.timezone) errors.push('กรุณาเลือกเขตเวลา');
  if (!cfg.currency) errors.push('กรุณาเลือกสกุลเงิน');
  if (!cfg.sheetVersion) errors.push('กรุณาระบุ Sheet Version');
  if (cfg.templateType !== 'empty_developer' && !cfg.exportFunctions.some(f => f.enabled)) {
    errors.push('ต้องเปิดใช้งาน Export Function อย่างน้อย 1 รายการ (หรือเลือก Empty Developer template)');
  }
  if (cfg.environment === 'production' && !cfg.ownerEmail) {
    errors.push('กรุณาระบุอีเมลเจ้าของ เมื่อใช้ Production environment');
  }
  const suspiciousTokens = ['mytoken', 'password', '12345', 'secret', 'token123'];
  if (cfg.bridgeEnabled && cfg.bridgeTokenPlaceholder &&
    suspiciousTokens.some(t => cfg.bridgeTokenPlaceholder.toLowerCase().includes(t))) {
    errors.push('Bridge token ดูเหมือน credential จริง — ใช้ placeholder เช่น REPLACE_WITH_YOUR_BRIDGE_TOKEN');
  }
  if (cfg.customerId && /[^0-9-]/.test(cfg.customerId)) {
    warnings.push('Customer ID มีอักขระพิเศษ — ควรเป็นตัวเลขและขีดกลางเท่านั้น เช่น 123-456-7890');
  }
  if (cfg.environment === 'production') {
    warnings.push('เลือก Production environment — ตรวจสอบการตั้งค่าทั้งหมดก่อน deploy');
  }
  if (cfg.bridgeEnabled &&
    cfg.bridgeEndpointUrl.includes('YOUR_DEPLOYMENT_ID')) {
    warnings.push('Bridge endpoint ยังเป็น placeholder — แทนที่ด้วย Apps Script deployment URL จริง');
  }
  if (cfg.dashboardEnabled && !cfg.dashboardAccountName) {
    warnings.push('Dashboard เปิดใช้งานแต่ยังไม่ได้ตั้งชื่อบัญชี Dashboard');
  }

  return { errors, warnings };
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <Box sx={{ position: 'relative' }}>
      <Paper
        variant="outlined"
        component="pre"
        sx={{
          p: 2,
          fontFamily: 'monospace',
          fontSize: '0.78rem',
          overflowX: 'auto',
          whiteSpace: 'pre',
          bgcolor: 'grey.900',
          color: '#e2e8f0',
          borderRadius: 1,
          m: 0,
        }}
      >
        {code}
      </Paper>
      <Button
        size="small"
        variant="outlined"
        startIcon={<ContentCopyIcon />}
        onClick={handleCopy}
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          color: '#e2e8f0',
          borderColor: 'rgba(255,255,255,0.3)',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
          fontSize: '0.7rem',
        }}
      >
        {copied ? 'คัดลอกแล้ว!' : 'คัดลอก'}
      </Button>
    </Box>
  );
}

function SummaryCard({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box sx={{ color: `${color ?? 'primary'}.main`, display: 'flex', alignItems: 'center' }}>
        {icon}
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{value}</Typography>
      </Box>
    </Paper>
  );
}

export function GeneratePage({ config }: Props) {
  const [snackMsg, setSnackMsg] = useState('');
  const [generating, setGenerating] = useState(false);

  const { errors, warnings } = validate(config);
  const canGenerate = errors.length === 0;
  const enabledFns = config.exportFunctions.filter(f => f.enabled);
  const filenameBase = getFilenameBase(config);
  const total = SHEET_TABS.core.length + SHEET_TABS.rawData.length + SHEET_TABS.dashboard.length + SHEET_TABS.mapping.length;

  const handleXlsx = async () => {
    setGenerating(true);
    try {
      downloadXlsx(config);
      setSnackMsg(`ดาวน์โหลด ${filenameBase}.xlsx แล้ว`);
    } finally {
      setGenerating(false);
    }
  };

  const handleZip = async () => {
    setGenerating(true);
    try {
      await downloadCsvZip(config);
      setSnackMsg(`ดาวน์โหลด ${filenameBase}.zip แล้ว`);
    } finally {
      setGenerating(false);
    }
  };

  const adsScriptSnippet = buildAdsScript(config);
  const bridgeSnippet = buildBridgeScript(config);

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>สร้างไฟล์ Sheet</Typography>
        <Typography variant="body2" color="text.secondary">
          ตรวจสอบการตั้งค่า แล้วดาวน์โหลด XLSX workbook หรือ CSV ZIP
        </Typography>
      </Box>

      {errors.length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }} icon={<ErrorIcon />}>
          <Typography variant="subtitle2" gutterBottom>แก้ไขรายการต่อไปนี้ก่อนสร้างไฟล์:</Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {errors.map((e, i) => <li key={i}><Typography variant="body2">{e}</Typography></li>)}
          </ul>
        </Alert>
      )}

      {warnings.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }} icon={<WarningAmberIcon />}>
          <Typography variant="subtitle2" gutterBottom>ข้อควรระวัง:</Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {warnings.map((w, i) => <li key={i}><Typography variant="body2">{w}</Typography></li>)}
          </ul>
        </Alert>
      )}

      {canGenerate && errors.length === 0 && warnings.length === 0 && (
        <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircleIcon />}>
          ผ่านการตรวจสอบทั้งหมดแล้ว พร้อมสร้างไฟล์
        </Alert>
      )}

      {canGenerate && warnings.length > 0 && (
        <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircleIcon />}>
          ผ่าน validation แล้ว (มี {warnings.length} คำเตือน) พร้อมสร้างไฟล์
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard
            icon={<TableChartIcon />}
            label="จำนวน Tabs ทั้งหมด"
            value={total}
            color="primary"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard
            icon={<OutputIcon />}
            label="Export Jobs ที่เปิดใช้งาน"
            value={`${enabledFns.length} / ${config.exportFunctions.length}`}
            color={enabledFns.length === 0 ? 'warning' : 'success'}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard
            icon={<CheckCircleIcon />}
            label="Environment"
            value={config.environment.toUpperCase()}
            color={config.environment === 'production' ? 'error' : config.environment === 'staging' ? 'warning' : 'success'}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard
            icon={<DownloadIcon />}
            label="ชื่อไฟล์"
            value={`${filenameBase.slice(0, 28)}…`}
            color="info"
          />
        </Grid>
      </Grid>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>สรุป Workbook</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            <Chip label={`บัญชี: ${config.accountNickname || '—'}`} size="small" />
            <Chip label={`CID: ${config.customerId || '—'}`} size="small" />
            <Chip label={config.environment.toUpperCase()} size="small"
              color={config.environment === 'production' ? 'error' : config.environment === 'staging' ? 'warning' : 'success'} />
            <Chip label={`${total} tabs`} size="small" variant="outlined" />
            <Chip label={`${enabledFns.length} export jobs`} size="small" variant="outlined" color="primary" />
            <Chip label={`ชื่อไฟล์: ${filenameBase}.xlsx`} size="small" variant="outlined" />
          </Box>

          <Accordion disableGutters variant="outlined" sx={{ mb: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body2">ดูตัวอย่าง: Tabs ทั้งหมด ({total})</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>ชื่อ Tab</TableCell>
                      <TableCell>หมวดหมู่</TableCell>
                      <TableCell>คำอธิบาย</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[
                      ...SHEET_TABS.core.map(t => ({ ...t, cat: 'Core' })),
                      ...SHEET_TABS.rawData.map(t => ({ ...t, cat: 'Raw Data' })),
                      ...SHEET_TABS.dashboard.map(t => ({ ...t, cat: 'Dashboard' })),
                      ...SHEET_TABS.mapping.map(t => ({ ...t, cat: 'Mapping' })),
                    ].map(t => (
                      <TableRow key={t.tab} hover>
                        <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{t.tab}</Typography></TableCell>
                        <TableCell><Chip label={t.cat} size="small" sx={{ fontSize: '0.65rem' }} /></TableCell>
                        <TableCell><Typography variant="caption" color="text.secondary">{t.description}</Typography></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>

          <Accordion disableGutters variant="outlined">
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body2">ดูตัวอย่าง: Export Jobs ที่เปิดใช้งาน ({enabledFns.length})</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              {enabledFns.length === 0 ? (
                <Box sx={{ p: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    ไม่มี export jobs ที่เปิดใช้งาน (Empty Developer template)
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Job Key</TableCell>
                        <TableCell>Destination Tab</TableCell>
                        <TableCell>Max Rows</TableCell>
                        <TableCell>Write Mode</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {enabledFns.map(fn => (
                        <TableRow key={fn.function_key} hover>
                          <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{fn.function_key}</Typography></TableCell>
                          <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{fn.destination_tab}</Typography></TableCell>
                          <TableCell>{fn.max_rows.toLocaleString()}</TableCell>
                          <TableCell><Chip label={fn.write_mode} size="small" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </AccordionDetails>
          </Accordion>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>ดาวน์โหลด</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={handleXlsx}
              disabled={!canGenerate || generating}
              size="large"
            >
              ดาวน์โหลด .xlsx
            </Button>
            <Button
              variant="outlined"
              startIcon={<FolderZipIcon />}
              onClick={handleZip}
              disabled={!canGenerate || generating}
              size="large"
            >
              ดาวน์โหลด .csv.zip
            </Button>
          </Box>
          {canGenerate && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              ไฟล์ถูกสร้างในเบราว์เซอร์ของคุณทั้งหมด ไม่มีการส่งข้อมูลไปยัง server ใด ๆ
            </Typography>
          )}
        </CardContent>
      </Card>

      <Divider sx={{ mb: 3 }} />

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>Google Ads Script (Complete — Runnable)</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Script สมบูรณ์พร้อม deploy ใน Google Ads แทนที่ <code>PASTE_GENERATED_SHEET_URL_HERE</code> ด้วย URL ของ Google Sheet จริง
            Script อ่าน config ทั้งหมดจาก Sheet ตอน runtime — ไม่มีการแก้ไข campaign ใด ๆ (read-only)
          </Typography>
          <CodeBlock code={adsScriptSnippet} />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>Apps Script Bridge (Complete — Deployable)</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Script สมบูรณ์พร้อม deploy ใน Google Apps Script Web App แทนที่ <code>PASTE_GENERATED_SHEET_URL_HERE</code> ด้วย URL ของ Google Sheet
            จากนั้น Deploy &gt; New Deployment &gt; Web App (Execute as: Me, Access: Anyone)
            Token ถูกอ่านจาก <code>_settings_bridge</code> ตอน runtime — ไม่มี credential ใดในโค้ดนี้
          </Typography>
          <CodeBlock code={bridgeSnippet} />
        </CardContent>
      </Card>

      <Snackbar
        open={!!snackMsg}
        autoHideDuration={4000}
        onClose={() => setSnackMsg('')}
        message={snackMsg}
      />
    </Box>
  );
}
