import { useState, useCallback } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import SaveIcon from '@mui/icons-material/Save';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import theme from './theme';
import { Sidebar, DRAWER_WIDTH } from './Sidebar';
import type { NavPage } from './Sidebar';
import { NewSheetPage } from './pages/NewSheetPage';
import { AccountSettingsPage } from './pages/AccountSettingsPage';
import { ExportFunctionsPage } from './pages/ExportFunctionsPage';
import { SheetTabsPage } from './pages/SheetTabsPage';
import { ScriptSettingsPage } from './pages/ScriptSettingsPage';
import { BridgeSettingsPage } from './pages/BridgeSettingsPage';
import { DashboardSettingsPage } from './pages/DashboardSettingsPage';
import { GeneratePage } from './pages/GeneratePage';
import { RecentDraftsPage } from './pages/RecentDraftsPage';
import { HelpPage } from './pages/HelpPage';
import { useDrafts } from './useDrafts';
import { createDefaultDraft } from './constants';
import type { DraftConfig } from './types';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

function App() {
  const [activePage, setActivePage] = useState<NavPage>('new-sheet');
  const [config, setConfig] = useState<DraftConfig>(() => createDefaultDraft({ name: 'Draft 1' }));
  const { drafts, saveDraft, deleteDraft, duplicateDraft } = useDrafts();

  const handleChange = useCallback((updates: Partial<DraftConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const handleSaveDraft = useCallback(() => {
    const draftName = config.accountNickname
      ? `${config.accountNickname}${config.customerId ? ` (${config.customerId})` : ''}`
      : config.name || 'Draft';
    saveDraft({ ...config, name: draftName });
  }, [config, saveDraft]);

  const handleLoadDraft = useCallback((draft: DraftConfig) => {
    setConfig(draft);
    setActivePage('new-sheet');
  }, []);

  const handleNewDraft = useCallback(() => {
    setConfig(createDefaultDraft({ name: `Draft ${drafts.length + 2}` }));
    setActivePage('new-sheet');
  }, [drafts.length]);

  const handleDuplicate = useCallback((id: string) => {
    duplicateDraft(id);
  }, [duplicateDraft]);

  const handleReset = useCallback(() => {
    setConfig(createDefaultDraft({ name: 'Draft' }));
  }, []);

  const renderPage = () => {
    const commonProps = { config, onChange: handleChange };
    switch (activePage) {
      case 'new-sheet': return <NewSheetPage {...commonProps} onSaveDraft={handleSaveDraft} />;
      case 'account-settings': return <AccountSettingsPage {...commonProps} />;
      case 'export-functions': return <ExportFunctionsPage {...commonProps} />;
      case 'sheet-tabs': return <SheetTabsPage />;
      case 'script-settings': return <ScriptSettingsPage {...commonProps} />;
      case 'bridge-settings': return <BridgeSettingsPage {...commonProps} />;
      case 'dashboard-settings': return <DashboardSettingsPage {...commonProps} />;
      case 'generate': return <GeneratePage config={config} />;
      case 'recent-drafts':
        return (
          <RecentDraftsPage
            drafts={drafts}
            activeDraftId={config.id}
            onLoad={handleLoadDraft}
            onDuplicate={handleDuplicate}
            onDelete={deleteDraft}
            onNew={handleNewDraft}
          />
        );
      case 'help': return <HelpPage />;
      default: return null;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar activePage={activePage} onNavigate={setActivePage} />

        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', ml: `${DRAWER_WIDTH}px` }}>
          <AppBar
            position="sticky"
            elevation={0}
            sx={{
              bgcolor: 'background.paper',
              borderBottom: 1,
              borderColor: 'divider',
              color: 'text.primary',
            }}
          >
            <Toolbar variant="dense" sx={{ gap: 1.5 }}>
              <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                {config.accountNickname && (
                  <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {config.accountNickname}
                  </Typography>
                )}
                {config.customerId && (
                  <Chip label={`CID: ${config.customerId}`} size="small" variant="outlined" />
                )}
                <Chip
                  label={config.environment.toUpperCase()}
                  size="small"
                  color={config.environment === 'production' ? 'error' : config.environment === 'staging' ? 'warning' : 'success'}
                />
              </Box>
              <Tooltip title="รีเซ็ตฟอร์มกลับค่าเริ่มต้น">
                <Button
                  size="small"
                  startIcon={<RestartAltIcon />}
                  onClick={handleReset}
                  color="inherit"
                  sx={{ color: 'text.secondary' }}
                >
                  รีเซ็ต
                </Button>
              </Tooltip>
              <Button
                size="small"
                variant="outlined"
                startIcon={<SaveIcon />}
                onClick={handleSaveDraft}
              >
                บันทึกร่าง
              </Button>
            </Toolbar>
          </AppBar>

          <Box
            component="main"
            sx={{
              flexGrow: 1,
              p: 3,
              bgcolor: 'background.default',
              maxWidth: 1100,
              width: '100%',
              mx: 'auto',
            }}
          >
            {renderPage()}
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
