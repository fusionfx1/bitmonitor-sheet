import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import type { DraftConfig } from '../types';

interface Props {
  drafts: DraftConfig[];
  activeDraftId: string;
  onLoad: (draft: DraftConfig) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('th-TH');
  } catch {
    return iso;
  }
}

export function RecentDraftsPage({ drafts, activeDraftId, onLoad, onDuplicate, onDelete, onNew }: Props) {
  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h5" gutterBottom>ร่างล่าสุด</Typography>
          <Typography variant="body2" color="text.secondary">
            ร่างทั้งหมดถูกเก็บไว้ใน localStorage ของเบราว์เซอร์เท่านั้น ไม่มีการส่งข้อมูลไปยัง server
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddCircleIcon />} onClick={onNew} size="small">
          ร่างใหม่
        </Button>
      </Box>

      {drafts.length === 0 && (
        <Alert severity="info">
          ยังไม่มีร่างที่บันทึกไว้ สร้างการตั้งค่า Sheet ใหม่แล้วกด "บันทึกร่าง"
        </Alert>
      )}

      <Grid container spacing={2}>
        {drafts.map(draft => (
          <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={draft.id}>
            <Card variant="outlined" sx={{ border: draft.id === activeDraftId ? 2 : 1, borderColor: draft.id === activeDraftId ? 'primary.main' : 'divider' }}>
              <CardContent sx={{ pb: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {draft.name || 'ร่างไม่มีชื่อ'}
                  </Typography>
                  {draft.id === activeDraftId && (
                    <Chip label="กำลังใช้งาน" size="small" color="primary" />
                  )}
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                  <Chip
                    label={draft.environment.toUpperCase()}
                    size="small"
                    color={draft.environment === 'production' ? 'error' : draft.environment === 'staging' ? 'warning' : 'success'}
                  />
                  {draft.accountNickname && <Chip label={draft.accountNickname} size="small" variant="outlined" />}
                  {draft.customerId && <Chip label={`CID: ${draft.customerId}`} size="small" variant="outlined" />}
                </Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  อัปเดต: {fmtDate(draft.updatedAt)}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  เปิดใช้งาน {draft.exportFunctions.filter(f => f.enabled).length} export functions
                </Typography>
              </CardContent>
              <Divider sx={{ mt: 1.5 }} />
              <CardActions sx={{ gap: 0.5 }}>
                <Button size="small" startIcon={<EditIcon />} onClick={() => onLoad(draft)}
                  variant={draft.id === activeDraftId ? 'contained' : 'text'} disableElevation>
                  {draft.id === activeDraftId ? 'กำลังใช้งาน' : 'โหลด'}
                </Button>
                <IconButton size="small" onClick={() => onDuplicate(draft.id)} title="ทำสำเนา">
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => onDelete(draft.id)} title="ลบ"
                  disabled={draft.id === activeDraftId} color="error">
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
