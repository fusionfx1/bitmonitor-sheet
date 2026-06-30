import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import OutputIcon from '@mui/icons-material/Output';
import TableChartIcon from '@mui/icons-material/TableChart';
import CodeIcon from '@mui/icons-material/Code';
import LinkIcon from '@mui/icons-material/Link';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DownloadIcon from '@mui/icons-material/Download';
import HistoryIcon from '@mui/icons-material/History';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';

export type NavPage =
  | 'new-sheet'
  | 'account-settings'
  | 'export-functions'
  | 'sheet-tabs'
  | 'script-settings'
  | 'bridge-settings'
  | 'dashboard-settings'
  | 'generate'
  | 'recent-drafts'
  | 'help';

interface NavItem {
  page: NavPage;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { page: 'new-sheet', label: 'สร้าง Sheet ใหม่', icon: <AddCircleOutlineIcon fontSize="small" /> },
  { page: 'account-settings', label: 'ตั้งค่าบัญชี', icon: <ManageAccountsIcon fontSize="small" /> },
  { page: 'export-functions', label: 'Export Functions', icon: <OutputIcon fontSize="small" /> },
  { page: 'sheet-tabs', label: 'Sheet Tabs', icon: <TableChartIcon fontSize="small" /> },
  { page: 'script-settings', label: 'ตั้งค่า Script', icon: <CodeIcon fontSize="small" /> },
  { page: 'bridge-settings', label: 'ตั้งค่า Bridge', icon: <LinkIcon fontSize="small" /> },
  { page: 'dashboard-settings', label: 'ตั้งค่า Dashboard', icon: <DashboardIcon fontSize="small" /> },
  { page: 'generate', label: 'สร้างไฟล์', icon: <DownloadIcon fontSize="small" /> },
  { page: 'recent-drafts', label: 'ร่างล่าสุด', icon: <HistoryIcon fontSize="small" /> },
  { page: 'help', label: 'วิธีใช้งาน', icon: <HelpOutlineIcon fontSize="small" /> },
];

const DRAWER_WIDTH = 224;

interface SidebarProps {
  activePage: NavPage;
  onNavigate: (page: NavPage) => void;
}

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          borderRight: 'none',
        },
      }}
    >
      <Box sx={{ px: 2, py: 2.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <MonitorHeartIcon sx={{ color: 'primary.light', fontSize: 22 }} />
        <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 700, letterSpacing: 0.5, lineHeight: 1.2 }}>
          BitMonitor<br />
          <Typography component="span" variant="caption" sx={{ color: 'rgba(255,255,255,0.55)', fontWeight: 400 }}>
            สร้าง Sheet
          </Typography>
        </Typography>
      </Box>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />
      <List dense sx={{ mt: 0.5 }}>
        {NAV_ITEMS.map(item => (
          <ListItemButton
            key={item.page}
            selected={activePage === item.page}
            onClick={() => onNavigate(item.page)}
            sx={{
              mx: 1,
              mb: 0.25,
              borderRadius: 1,
              '&.Mui-selected': {
                bgcolor: 'rgba(255,255,255,0.15)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
              },
              '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
            }}
          >
            <ListItemIcon sx={{ minWidth: 32, color: activePage === item.page ? '#fff' : 'rgba(255,255,255,0.6)' }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{
                fontSize: '0.8125rem',
                color: activePage === item.page ? '#fff' : 'rgba(255,255,255,0.7)',
                fontWeight: activePage === item.page ? 600 : 400,
              }}
            />
          </ListItemButton>
        ))}
      </List>
    </Drawer>
  );
}

export { DRAWER_WIDTH };
