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
import type { DraftConfig } from '../types';
import { SHEET_TABS } from '../constants';
import { downloadXlsx, downloadCsvZip, getFilenameBase } from '../xlsxGenerator';

interface Props {
  config: DraftConfig;
}

function validate(cfg: DraftConfig): string[] {
  const errors: string[] = [];
  if (!cfg.customerId) errors.push('กรุณาระบุ Customer ID');
  if (!cfg.accountNickname) errors.push('กรุณาระบุชื่อย่อบัญชี (Nickname)');
  if (!cfg.timezone) errors.push('กรุณาเลือกเขตเวลา');
  if (!cfg.currency) errors.push('กรุณาเลือกสกุลเงิน');
  if (!cfg.sheetVersion) errors.push('กรุณาระบุ Sheet Version');
  if (!cfg.exportFunctions.some(f => f.enabled)) errors.push('ต้องเปิดใช้งาน Export Function อย่างน้อย 1 รายการ');
  if (cfg.bridgeEnabled && cfg.bridgeTokenPlaceholder && cfg.bridgeTokenPlaceholder.length < 8) {
    errors.push('Bridge token placeholder สั้นเกินไป — ควรใช้ placeholder ที่ยาวกว่านี้');
  }
  const suspiciousTokens = ['mytoken', 'password', '12345', 'secret'];
  if (cfg.bridgeEnabled && suspiciousTokens.some(t => cfg.bridgeTokenPlaceholder.toLowerCase().includes(t))) {
    errors.push('Bridge token placeholder ดูเหมือน credential จริง — ควรใช้ placeholder เช่น REPLACE_WITH_YOUR_BRIDGE_TOKEN');
  }
  return errors;
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

export function GeneratePage({ config }: Props) {
  const [snackMsg, setSnackMsg] = useState('');
  const [generating, setGenerating] = useState(false);

  const errors = validate(config);
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

  const adsScriptSnippet = `// Google Ads Script — Sheet Config
// วางโค้ดนี้ใน Google Ads Script ของคุณ
// Script จะอ่านการตั้งค่าทั้งหมดจาก Sheet tabs — ไม่ต้องเขียน constants ใน script

const SHEET_URL = "วาง URL ของ Sheet ที่สร้างไว้ที่นี่";
const CONFIG_TAB = "_settings_exporter";
const EXPORT_JOBS_TAB = "_export_jobs";
const SCRIPT_HEALTH_TAB = "_script_health";
const SYNC_RUNS_TAB = "_sync_runs";
const ERROR_LOG_TAB = "_error_log";
const SCRIPT_VERSION = "${config.scriptVersion}";
const ADS_API_VERSION = "${config.adsApiVersion}";

// Script จะอ่าน GOOGLE_ADS_CUSTOMER_ID, DATE_RANGE_MODE,
// MAX_ROWS, WRITE_MODE ฯลฯ จาก CONFIG_TAB ตอน runtime
// ทำให้การตั้งค่าทั้งหมดอยู่ใน Sheet ไม่ใช่ใน script`;

  const bridgeSnippet = `// Apps Script Bridge — Sheet Config
// วางโค้ดนี้ใน Apps Script web app ของคุณ
// Bridge token จะถูกอ่านจาก Sheet _settings_bridge ตอน runtime

const SHEET_URL = "วาง URL ของ Sheet ที่สร้างไว้ที่นี่";
const CONFIG_TAB = "_settings_bridge";
const DASHBOARD_CONFIG_TAB = "_settings_dashboard";
const SCRIPT_HEALTH_TAB = "_script_health";
const SYNC_RUNS_TAB = "_sync_runs";
const ERROR_LOG_TAB = "_error_log";
const BRIDGE_VERSION = "${config.sheetVersion}";

// สำคัญ: อ่าน BRIDGE_TOKEN_PLACEHOLDER จาก CONFIG_TAB ตอน runtime
// ตรวจสอบ token ของ request ที่เข้ามากับค่านี้
// ห้ามเขียน token จริงลงใน script โดยตรง`;

  const setupInstructions = `BitMonitor Sheet Generator — ขั้นตอนการ Deploy
================================================
บัญชี: ${config.accountNickname || '(ยังไม่ได้ตั้งค่า)'}
Customer ID: ${config.customerId || '(ยังไม่ได้ตั้งค่า)'}
Environment: ${config.environment.toUpperCase()}
สร้างเมื่อ: ${new Date().toISOString()}

ขั้นตอนที่ 1: สร้าง Google Sheet ใหม่
  - ล็อกอิน Google Drive ในฐานะเจ้าของบัญชี (${config.ownerEmail || 'owner'})
  - สร้าง Google Sheet เปล่าใหม่
  - ตั้งชื่อว่า: BitMonitor - ${config.accountNickname || 'Account'} - ${config.customerId || 'CID'}
  - คัดลอก URL ของ Sheet นี้

ขั้นตอนที่ 2: นำเข้า tabs จากไฟล์ XLSX ที่สร้าง
  - เปิดไฟล์ .xlsx ที่ดาวน์โหลด
  - สำหรับแต่ละ tab: คัดลอก headers และแถวข้อมูลไปยัง Google Sheet tab ที่ตรงกัน
  - ชื่อ tab ต้องตรงกันทุกตัวอักษร

ขั้นตอนที่ 3: ตั้งค่า Google Ads Script
  - เปิด Google Ads > เครื่องมือ > Scripts
  - สร้าง script ใหม่
  - วาง config snippet ของ Google Ads Script
  - แทนที่ URL placeholder ด้วย Sheet URL จากขั้นตอนที่ 1
  - อนุญาต (Authorize) script ภายใต้บัญชี Google Ads ที่ถูกต้อง

ขั้นตอนที่ 4: ทดสอบ
  - รัน script ครั้งแรกด้วย environment = test
  - ตรวจสอบ tab _script_health ว่าสถานะ OK
  - ตรวจสอบ tab _error_log ว่าไม่มี error

ขั้นตอนที่ 5: Production
  - อัปเดต environment ใน _settings_global เป็น 'production'
  - ตั้ง daily trigger ใน Google Ads Script scheduler
  - ติดตาม _script_health เป็นประจำ

ข้อเตือนใจเรื่องการแยก: Sheet นี้สำหรับบัญชี ${config.customerId || '(ยังไม่ได้ตั้งค่า)'} เท่านั้น
ห้ามแชร์ Sheet URL นี้กับบัญชีอื่น
แต่ละบัญชีต้องมี Sheet แยกของตัวเอง`;

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>สร้างไฟล์ Sheet</Typography>
        <Typography variant="body2" color="text.secondary">
          ตรวจสอบการตั้งค่า แล้วดาวน์โหลด XLSX workbook หรือ CSV ZIP
        </Typography>
      </Box>

      {config.environment === 'production' && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <strong>เลือก Production แล้ว!</strong> ตรวจสอบการตั้งค่าทั้งหมดให้ครบถ้วนก่อนสร้างและ deploy
        </Alert>
      )}

      {errors.length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }} icon={<ErrorIcon />}>
          <Typography variant="subtitle2" gutterBottom>แก้ไขรายการต่อไปนี้ก่อนสร้างไฟล์:</Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {errors.map((e, i) => <li key={i}><Typography variant="body2">{e}</Typography></li>)}
          </ul>
        </Alert>
      )}

      {canGenerate && (
        <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircleIcon />}>
          ผ่านการตรวจสอบทั้งหมดแล้ว พร้อมสร้างไฟล์
        </Alert>
      )}

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
          <Typography variant="subtitle2" sx={{ mb: 2 }}>Code Snippet สำหรับ Google Ads Script</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            วางใน Google Ads Script ของคุณ แทนที่ URL placeholder ด้วย Sheet URL จริง
            การตั้งค่าทั้งหมดอื่น ๆ อ่านจาก Sheet ตอน runtime
          </Typography>
          <CodeBlock code={adsScriptSnippet} />
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>Code Snippet สำหรับ Apps Script Bridge</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            วางใน Apps Script web app Bridge token จะถูกอ่านจาก Sheet ตอน runtime
          </Typography>
          <CodeBlock code={bridgeSnippet} />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>ขั้นตอนการ Deploy</Typography>
          <CodeBlock code={setupInstructions} />
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
