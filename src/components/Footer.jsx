import { Box, Typography, IconButton, Link } from '@mui/material';
import { Instagram, WhatsApp } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { memo } from 'react';
import './css/Footer.css';

const Footer = memo(() => {
  const theme = useTheme();

  return (
    <Box
      component="footer"
      sx={{
        width: '100vw',
        position: 'relative',
        left: '50%',
        right: '50%',
        marginLeft: '-50vw',
        marginRight: '-50vw',
        background: `linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%)`,
        color: 'var(--text-color)',
        padding: { xs: '24px 16px', md: '32px 24px' },
        borderTop: '1px solid rgba(0, 0, 0, 0.1)',
        boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.06)',
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: { xs: '16px', md: '24px' },
        mt: 'auto',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: { xs: 'center', md: 'flex-start' },
          textAlign: { xs: 'center', md: 'left' },
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontWeight: 500,
            fontSize: { xs: '14px', md: '16px' },
            color: 'var(--text-color)',
          }}
        >
          © 2025 La Coupole. All rights reserved.
        </Typography>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 400,
            fontSize: { xs: '12px', md: '14px' },
            color: 'var(--text-color)',
            opacity: 0.8,
            mt: '4px',
          }}
        >
          Created by Dark.exe00
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: { xs: 'center', md: 'flex-end' },
          gap: '12px',
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontWeight: 500,
            fontSize: { xs: '14px', md: '16px' },
            color: 'var(--text-color)',
          }}
        >
          Contact Us
        </Typography>
        <Box sx={{ display: 'flex', gap: '12px' }}>
          <IconButton
            component={Link}
            href="https://www.instagram.com/dark.exe00/"
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              width: { xs: '40px', md: '44px' },
              height: { xs: '40px', md: '44px' },
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: 'var(--text-color)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
              },
            }}
          >
            <Instagram sx={{ fontSize: { xs: '20px', md: '24px' } }} />
          </IconButton>
          <IconButton
            component={Link}
            href="https://wa.me/92720527"
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              width: { xs: '40px', md: '44px' },
              height: { xs: '40px', md: '44px' },
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: 'var(--text-color)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
              },
            }}
          >
            <WhatsApp sx={{ fontSize: { xs: '20px', md: '24px' } }} />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
});

export default Footer;
