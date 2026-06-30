import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import Paper from '@mui/material/Paper';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Collapse from '@mui/material/Collapse';
import Alert from '@mui/material/Alert';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import type { DraftConfig, ExportFunction, WriteMode } from '../types';

interface Props {
  config: DraftConfig;
  onChange: (updates: Partial<DraftConfig>) => void;
}

function updateFn(fns: ExportFunction[], key: string, updates: Partial<ExportFunction>): ExportFunction[] {
  return fns.map(f => f.function_key === key ? { ...f, ...updates } : f);
}

export function ExportFunctionsPage({ config, onChange }: Props) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const enabledCount = config.exportFunctions.filter(f => f.enabled).length;

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>Export Functions</Typography>
        <Typography variant="body2" color="text.secondary">
          เปิด/ปิดแต่ละ export job การตั้งค่าทั้งหมดจะถูกเขียนลง tab <code>_export_jobs</code> ใน Sheet ที่สร้างขึ้น
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        เปิดใช้งาน {enabledCount} จาก {config.exportFunctions.length} export functions
        ต้องเปิดอย่างน้อย 1 อันจึงจะสร้าง Sheet ได้
      </Alert>

      <Paper variant="outlined">
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" />
                <TableCell>เปิด</TableCell>
                <TableCell>Function Key</TableCell>
                <TableCell>ชื่อที่แสดง</TableCell>
                <TableCell>Destination Tab</TableCell>
                <TableCell>Date Grain</TableCell>
                <TableCell align="right">Max Rows</TableCell>
                <TableCell>Write Mode</TableCell>
                <TableCell>GAQL Resource</TableCell>
                <TableCell>สถานะ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {config.exportFunctions.map(fn => (
                <>
                  <TableRow
                    key={fn.function_key}
                    hover
                    sx={{ opacity: fn.enabled ? 1 : 0.5 }}
                  >
                    <TableCell padding="checkbox">
                      <IconButton
                        size="small"
                        onClick={() => setExpandedRow(expandedRow === fn.function_key ? null : fn.function_key)}
                      >
                        {expandedRow === fn.function_key ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <Switch
                        size="small"
                        checked={fn.enabled}
                        onChange={e => onChange({ exportFunctions: updateFn(config.exportFunctions, fn.function_key, { enabled: e.target.checked }) })}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{fn.function_key}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{fn.display_name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{fn.destination_tab}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={fn.date_grain} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{fn.max_rows.toLocaleString()}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={fn.write_mode}
                        size="small"
                        color={fn.write_mode === 'append' ? 'info' : fn.write_mode === 'upsert' ? 'warning' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {fn.gaql_resource_rule}
                        </Typography>
                        {fn.compatibility_notes && (
                          <Tooltip title={fn.compatibility_notes} placement="top">
                            <InfoOutlinedIcon sx={{ fontSize: 14, color: 'text.secondary', cursor: 'pointer' }} />
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={fn.status === 'active' ? 'ใช้งาน' : fn.status} size="small" color={fn.status === 'active' ? 'success' : 'default'} />
                    </TableCell>
                  </TableRow>

                  {expandedRow === fn.function_key && (
                    <TableRow key={`${fn.function_key}-expand`}>
                      <TableCell colSpan={10} sx={{ py: 0 }}>
                        <Collapse in>
                          <Box sx={{ p: 2, bgcolor: 'grey.50', display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            <TextField
                              label="Max Rows"
                              size="small"
                              type="number"
                              value={fn.max_rows}
                              onChange={e => onChange({ exportFunctions: updateFn(config.exportFunctions, fn.function_key, { max_rows: Number(e.target.value) }) })}
                              sx={{ width: 120 }}
                              inputProps={{ min: 1 }}
                            />
                            <TextField
                              label="Lookback Days (override)"
                              size="small"
                              type="number"
                              value={fn.lookback_days_override ?? ''}
                              placeholder={`ค่าเริ่มต้น (${config.lookbackDays})`}
                              onChange={e => onChange({ exportFunctions: updateFn(config.exportFunctions, fn.function_key, { lookback_days_override: e.target.value ? Number(e.target.value) : null }) })}
                              sx={{ width: 200 }}
                              inputProps={{ min: 1 }}
                            />
                            <Select
                              size="small"
                              value={fn.write_mode}
                              onChange={e => onChange({ exportFunctions: updateFn(config.exportFunctions, fn.function_key, { write_mode: e.target.value as WriteMode }) })}
                              sx={{ width: 130 }}
                            >
                              <MenuItem value="overwrite">overwrite</MenuItem>
                              <MenuItem value="append">append</MenuItem>
                              <MenuItem value="upsert">upsert</MenuItem>
                            </Select>
                            <TextField
                              label="หมายเหตุ"
                              size="small"
                              value={fn.notes}
                              onChange={e => onChange({ exportFunctions: updateFn(config.exportFunctions, fn.function_key, { notes: e.target.value }) })}
                              sx={{ flexGrow: 1, minWidth: 200 }}
                            />
                          </Box>
                          <Box sx={{ px: 2, pb: 2, bgcolor: 'grey.50' }}>
                            <Typography variant="caption" color="text.secondary">
                              <strong>GAQL Resource:</strong> {fn.gaql_resource_rule} &nbsp;|&nbsp;
                              <strong>ข้อควรระวัง:</strong> {fn.compatibility_notes || 'ไม่มี'}
                            </Typography>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
