import { useState, useEffect, useRef } from 'react';
import {
  IconButton,
  Badge,
  Popover,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Box,
  Divider,
  CircularProgress,
  Button,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Notifications as NotificationsIcon, Receipt, TableBar, CheckCircle } from '@mui/icons-material';
import { api } from '../services/api';
import { toast } from 'react-toastify';
import { useLocation } from 'react-router-dom';

const notificationStyles = {
  notificationList: {
    width: '420px',
    maxHeight: '520px',
    overflowY: 'auto',
    padding: '8px 0',
    background: 'linear-gradient(180deg, #ffffff 0%, #f9fafb 100%)',
    '&::-webkit-scrollbar': {
      width: '8px',
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: '#d1d5db',
      borderRadius: '999px',
    },
    '&::-webkit-scrollbar-thumb:hover': {
      backgroundColor: '#9ca3af',
    },
  },
  notificationItem: {
    margin: '6px 12px',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 6px 12px rgba(17, 24, 39, 0.06)',
    cursor: 'pointer',
    transition: 'transform 0.15s ease-out, box-shadow 0.15s ease-out',
    '&:hover': {
      transform: 'translateY(-1px)',
      boxShadow: '0 10px 20px rgba(17, 24, 39, 0.08)',
    },
  },
  unread: {
    backgroundColor: '#eef2ff',
    fontWeight: 600,
    borderColor: '#c7d2fe',
  },
  read: {
    backgroundColor: '#ffffff',
    color: '#4b5563',
  },
  icon: {
    fontSize: 20,
    color: '#6366f1',
  },
  timestamp: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '2px',
  },
  emptyMessage: {
    padding: '20px',
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '14px',
  },
  bellButton: {
    padding: '8px',
  },
  popover: {
    marginTop: '8px',
    '& .MuiPaper-root': {
      borderRadius: '14px',
      boxShadow: '0 16px 32px rgba(15, 23, 42, 0.18)',
      border: '1px solid #e5e7eb',
    },
  },
  header: {
    padding: '14px 18px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    position: 'sticky',
    top: 0,
    zIndex: 1,
  },
  title: {
    fontSize: '17px',
    fontWeight: '700',
    color: '#0f172a',
  },
  clearButton: {
    padding: '6px 12px',
    fontSize: '13px',
    textTransform: 'none',
    color: '#4f46e5',
    '&:hover': {
      backgroundColor: '#eef2ff',
    },
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    padding: '16px',
  },
  soundToggle: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 16px',
    borderTop: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
  },
  dialog: {
    maxWidth: '400px',
    margin: 'auto',
  },
  dialogTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
  },
  dialogContent: {
    fontSize: '14px',
    color: '#6b7280',
  },
};

function NotificationBell({ user, navigate, notifications, handleNewNotification, socket }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showInteractionPrompt, setShowInteractionPrompt] = useState(false);
  const audioRef = useRef(null);
  const hasInteracted = useRef(false);
  const location = useLocation();
  const pendingSounds = useRef([]); // Queue for pending notifications
  const retryAttempts = useRef({}); // Track retries per notification

  // Check and preload audio
  useEffect(() => {
    if (!user || !['admin', 'server'].includes(user.role)) return;

    const audioPath = '/assets/notification.mp3';
    audioRef.current = new Audio(audioPath);
    audioRef.current.preload = 'auto';

    // Validate audio file existence
    fetch(audioPath, { method: 'HEAD' })
      .then((response) => {
        if (!response.ok) {
          console.error(`Fichier audio introuvable à ${audioPath}`, { timestamp: new Date().toISOString() });
          toast.error('Le fichier de son de notification est manquant.');
        } else {
          console.log(`Fichier audio préchargé avec succès : ${audioPath}`, { timestamp: new Date().toISOString() });
        }
      })
      .catch((err) => {
        console.error('Erreur lors de la vérification du fichier audio :', err, { timestamp: new Date().toISOString() });
        toast.error('Échec du chargement du son de notification.');
      });

    // Check interaction state from localStorage
    const interactionState = localStorage.getItem('hasInteracted');
    if (interactionState === 'true') {
      hasInteracted.current = true;
    } else {
      setShowInteractionPrompt(true); // Show prompt if no prior interaction
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [user]);

  // Handle user interaction and socket events
  useEffect(() => {
    if (!user || !socket || !['admin', 'server'].includes(user.role)) return;

    const handleInteraction = () => {
      if (!hasInteracted.current) {
        hasInteracted.current = true;
        localStorage.setItem('hasInteracted', 'true');
        console.log('Interaction utilisateur détectée, lecture audio activée', { timestamp: new Date().toISOString() });
        // Play all pending sounds
        if (soundEnabled && pendingSounds.current.length > 0) {
          pendingSounds.current.forEach((notification) => playSound(notification));
          pendingSounds.current = [];
          retryAttempts.current = {};
        }
      }
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);

    const playSound = async (notification, attempt = 1) => {
      if (!soundEnabled) {
        console.log('Son désactivé par l’utilisateur, lecture ignorée', { notificationId: notification.id, timestamp: new Date().toISOString() });
        return;
      }
      if (!audioRef.current) {
        console.warn('Audio non initialisé', { notificationId: notification.id, timestamp: new Date().toISOString() });
        return;
      }
      if (!hasInteracted.current) {
        console.log('Aucune interaction utilisateur, mise en file d’attente du son pour la notification :', notification.id, {
          timestamp: new Date().toISOString(),
        });
        if (!pendingSounds.current.some((n) => n.id === notification.id)) {
          pendingSounds.current.push(notification);
        }
        return;
      }
      try {
        audioRef.current.currentTime = 0;
        await audioRef.current.play();
        console.log('Son de notification joué avec succès pour :', notification.id, {
          timestamp: new Date().toISOString(),
        });
        retryAttempts.current[notification.id] = 0; // Reset retries on success
      } catch (err) {
        console.error('Échec de la lecture audio :', err, {
          notificationId: notification.id,
          attempt,
          timestamp: new Date().toISOString(),
        });
        const maxRetries = 3;
        if (attempt <= maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
          console.log(`Nouvelle tentative de lecture du son pour la notification ${notification.id} après ${delay}ms`, {
            attempt,
            timestamp: new Date().toISOString(),
          });
          setTimeout(() => playSound(notification, attempt + 1), delay);
          retryAttempts.current[notification.id] = attempt;
        } else {
          console.warn(`Nombre maximum de tentatives (${maxRetries}) atteint pour la notification ${notification.id}`, {
            timestamp: new Date().toISOString(),
          });
          toast.warn('Le son de notification est bloqué par le navigateur. Veuillez activer le son ou interagir avec la page.');
        }
      }
    };

    const handleSocketNotification = (notification) => {
      if (!notification?.type || !notification?.id) {
        console.warn('Données de notification invalides reçues :', notification, { timestamp: new Date().toISOString() });
        return;
      }
      if (notification.type === 'order' && !notification.is_read) {
        console.log('Nouvelle notification de commande reçue :', notification, { timestamp: new Date().toISOString() });
        playSound(notification);
      }
      handleNewNotification(notification);
    };

    socket.on('newNotification', handleSocketNotification);

    socket.on('connect', () => {
      console.log('Socket connecté, vérification des notifications en attente', { timestamp: new Date().toISOString() });
      const unreadOrder = notifications.find((n) => n.type === 'order' && !n.is_read);
      if (unreadOrder && soundEnabled) {
        console.log('Notification de commande non lue trouvée :', unreadOrder, { timestamp: new Date().toISOString() });
        playSound(unreadOrder);
      }
    });

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      socket.off('newNotification', handleSocketNotification);
      socket.off('connect');
    };
  }, [user, socket, notifications, handleNewNotification, soundEnabled]);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
    hasInteracted.current = true;
    localStorage.setItem('hasInteracted', 'true');
    // Play all pending sounds
    if (soundEnabled && pendingSounds.current.length > 0) {
      pendingSounds.current.forEach((notification) => playSound(notification));
      pendingSounds.current = [];
      retryAttempts.current = {};
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.is_read) {
        await api.markNotificationRead(notification.id);
        handleNewNotification({
          ...notification,
          is_read: 1,
        });
      }
      handleClose();
      if (notification.type === 'order' && notification.reference_id) {
        const targetPath = `/staff?expandOrder=${notification.reference_id}&scrollTo=${notification.reference_id}`;
        if (location.pathname + location.search !== targetPath) {
          navigate(targetPath, { replace: true });
        }
      } else if (notification.type === 'order') {
        console.warn('Notification de commande invalide : reference_id manquant', notification, { timestamp: new Date().toISOString() });
        toast.error('Impossible de naviguer vers la commande : ID de commande invalide');
        if (location.pathname !== '/staff') {
          navigate('/staff', { replace: true });
        }
      } else if (notification.type === 'reservation') {
        const targetPath = `/reservation/${notification.reference_id}`;
        if (location.pathname !== targetPath) {
          navigate(targetPath, { replace: true });
        }
      }
    } catch (err) {
      console.error('Erreur lors du traitement de la notification :', err, { timestamp: new Date().toISOString() });
      toast.error('Échec du traitement de la notification');
    }
  };

  const handleClearNotifications = async () => {
    try {
      setIsLoading(true);
      await api.clearNotifications();
      handleNewNotification({ clearAll: true });
      toast.success('Toutes les notifications ont été supprimées');
    } catch (err) {
      console.error('Erreur lors de la suppression des notifications :', err, { timestamp: new Date().toISOString() });
      toast.error('Échec de la suppression des notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSoundToggle = (event) => {
    setSoundEnabled(event.target.checked);
    if (event.target.checked && pendingSounds.current.length > 0) {
      pendingSounds.current.forEach((notification) => playSound(notification));
      pendingSounds.current = [];
      retryAttempts.current = {};
    }
  };

  const handleInteractionConfirm = () => {
    hasInteracted.current = true;
    localStorage.setItem('hasInteracted', 'true');
    setShowInteractionPrompt(false);
    if (soundEnabled && pendingSounds.current.length > 0) {
      pendingSounds.current.forEach((notification) => playSound(notification));
      pendingSounds.current = [];
      retryAttempts.current = {};
    }
    // Force page refresh to ensure orders are fetched
    
  };

  const open = Boolean(anchorEl);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <>
      <IconButton onClick={handleClick} sx={notificationStyles.bellButton}>
        <Badge badgeContent={unreadCount} color="primary">
          <NotificationsIcon sx={{ color: '#374151' }} />
        </Badge>
      </IconButton>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={notificationStyles.popover}
      >
        <Box sx={notificationStyles.header}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography sx={notificationStyles.title}>Notifications</Typography>
            {notifications.length > 0 && (
              <Button
                onClick={handleClearNotifications}
                sx={notificationStyles.clearButton}
                disabled={isLoading}
              >
                Tout supprimer
              </Button>
            )}
          </Box>
        </Box>
        {isLoading ? (
          <Box sx={notificationStyles.loadingContainer}>
            <CircularProgress size={24} />
          </Box>
        ) : notifications.length === 0 ? (
          <Typography sx={notificationStyles.emptyMessage}>
            Aucune notification pour le moment
          </Typography>
        ) : (
          <List sx={notificationStyles.notificationList}>
            {notifications.map((notification, index) => (
              <ListItem
                key={notification.id || index}
                sx={[notificationStyles.notificationItem, notification.is_read ? notificationStyles.read : notificationStyles.unread]}
                onClick={() => handleNotificationClick(notification)}
              >
                <ListItemIcon>
                  {notification.type === 'order' ? (
                    <Receipt sx={notificationStyles.icon} />
                  ) : notification.type === 'reservation' ? (
                    <TableBar sx={notificationStyles.icon} />
                  ) : (
                    <CheckCircle sx={notificationStyles.icon} />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={notification.message}
                  secondary={
                    <Typography sx={notificationStyles.timestamp}>
                      {new Date(notification.created_at).toLocaleString('fr-FR')}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
        <Box sx={notificationStyles.soundToggle}>
          <Typography sx={{ fontSize: '14px', color: '#111827' }}>Son des notifications</Typography>
          <Switch
            checked={soundEnabled}
            onChange={handleSoundToggle}
            color="primary"
            size="small"
          />
        </Box>
      </Popover>
      <Dialog
        open={showInteractionPrompt}
        onClose={handleInteractionConfirm}
        sx={notificationStyles.dialog}
      >
        <DialogTitle sx={notificationStyles.dialogTitle}>Activer les notifications</DialogTitle>
        <DialogContent sx={notificationStyles.dialogContent}>
          <Typography>
            Pour garantir la réception des notifications et des commandes, veuillez cliquer sur "Confirmer" pour activer la lecture audio et actualiser la page.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleInteractionConfirm} color="primary" variant="contained">
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default NotificationBell;
