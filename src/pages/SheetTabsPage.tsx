import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import { SHEET_TABS } from '../constants';

const CATEGORY_COLORS = {
  'Core': 'primary',
  'Raw Data': 'info',
  'Dashboard': 'success',
  'Mapping': 'warning',
} as const;

function TabGroup({ title, tabs, category }: { title: string; tabs: { tab: string; description: string }[]; category: keyof typeof CATEGORY_COLORS }) {
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent sx={{ pb: '12px !important' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Typography variant="subtitle2">{title}</Typography>
          <Chip label={tabs.length} size="small" color={CATEGORY_COLORS[category]} />
        </Box>
        <Paper variant="outlined">
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ชื่อ Tab</TableCell>
                  <TableCell>คำอธิบาย</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tabs.map(t => (
                  <TableRow key={t.tab} hover>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{t.tab}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">{t.description}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </CardContent>
    </Card>
  );
}

export function SheetTabsPage() {
  const total = SHEET_TABS.core.length + SHEET_TABS.rawData.length + SHEET_TABS.dashboard.length + SHEET_TABS.mapping.length;

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>Sheet Tabs</Typography>
        <Typography variant="body2" color="text.secondary">
          workbook ที่สร้างขึ้นจะมี <strong>{total} tabs</strong> แบ่งออกเป็น 4 หมวดหมู่
          ทุก tab ไม่ถูกล็อก — ไม่มี protected ranges
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
        <Chip label={`${SHEET_TABS.core.length} Core`} color="primary" size="small" />
        <Chip label={`${SHEET_TABS.rawData.length} Raw Data`} color="info" size="small" />
        <Chip label={`${SHEET_TABS.dashboard.length} Dashboard`} color="success" size="small" />
        <Chip label={`${SHEET_TABS.mapping.length} Mapping`} color="warning" size="small" />
        <Chip label={`รวม ${total} tabs`} variant="outlined" size="small" />
      </Box>

      <TabGroup title="Core Tabs (แกนหลัก)" tabs={SHEET_TABS.core} category="Core" />
      <TabGroup title="Raw Data Tabs (ข้อมูลดิบ)" tabs={SHEET_TABS.rawData} category="Raw Data" />
      <TabGroup title="Dashboard Tabs" tabs={SHEET_TABS.dashboard} category="Dashboard" />
      <TabGroup title="Mapping / Reference Tabs (ตารางอ้างอิง)" tabs={SHEET_TABS.mapping} category="Mapping" />
    </Box>
  );
}
