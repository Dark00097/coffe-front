import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { toast } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid';
import { debounce } from 'lodash';
import { LocationOn, Note, Download, ContentCopy, Home } from '@mui/icons-material';
import html2canvas from 'html2canvas';
import './css/OrderWaiting.css';

// Helper function to safely parse numbers
const safeParseFloat = (value, defaultValue = 0) => {
  if (value === null || value === undefined || value === '' || value === 'NULL') {
    return defaultValue;
  }
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

const safeParseInt = (value, defaultValue = 0) => {
  if (value === null || value === undefined || value === '' || value === 'NULL') {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

function OrderWaiting({ sessionId: propSessionId, socket }) {
  const { orderId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [orderDetails, setOrderDetails] = useState(null);
  const [isApproved, setIsApproved] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingApproval, setIsProcessingApproval] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [itemsVisible, setItemsVisible] = useState(false);
  const [currency, setCurrency] = useState('$');
  const audioRef = useRef(null);
  const hasPlayedSound = useRef(false);
  const hasInteracted = useRef(false);
  const factureRef = useRef(null);

  // Prioritize session ID from navigation state
  const sessionId = state?.sessionId || localStorage.getItem('sessionId') || propSessionId || `guest-${uuidv4()}`;
  const isMounted = useRef(false);

  // Fetch currency from theme
  useEffect(() => {
    const fetchTheme = async () => {
      try {
        const themeResponse = await api.getTheme();
        console.log('Theme response:', themeResponse.data);
        if (themeResponse.data && themeResponse.data.currency) {
          console.log('Setting currency to:', themeResponse.data.currency);
          setCurrency(themeResponse.data.currency);
        } else {
          console.log('No currency found in theme data');
        }
      } catch (error) {
        console.error('Error fetching theme for currency:', error);
      }
    };
    fetchTheme();
  }, []);

  // Preload audio and validate
  useEffect(() => {
    const audioPath = '/assets/notification1.mp3';
    audioRef.current = new Audio(audioPath);
    audioRef.current.preload = 'auto';

    fetch(audioPath, { method: 'HEAD' })
      .then((response) => {
        if (!response.ok) {
          console.error(`Fichier audio introuvable à ${audioPath}`, { timestamp: new Date().toISOString() });
          toast.error('Le fichier son de confirmation de commande est manquant.');
        } else {
          console.log(`Fichier audio préchargé avec succès : ${audioPath}`, { timestamp: new Date().toISOString() });
        }
      })
      .catch((err) => {
        console.error('Erreur lors de la vérification du fichier audio :', err, { timestamp: new Date().toISOString() });
        toast.error('Échec du chargement du son de confirmation de commande.');
      });

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Debounced order details update
  const debouncedSetOrderDetails = useCallback(
    debounce((newDetails) => {
      setOrderDetails(newDetails);
    }, 100),
    []
  );

  useEffect(() => {
    if (!state?.sessionId && !localStorage.getItem('sessionId')) {
      console.warn('Aucun ID de session trouvé dans l\'état ou localStorage, généré un nouveau :', sessionId, 'timestamp :', new Date().toISOString());
      localStorage.setItem('sessionId', sessionId);
      api.defaults.headers.common['X-Session-Id'] = sessionId;
    }
    console.log('OrderWaiting initialisé avec sessionId :', sessionId, 'orderId :', orderId, 'timestamp :', new Date().toISOString());
  }, [sessionId, orderId]);

  useEffect(() => {
    if (!isLoading && !errorMessage) {
      setTimeout(() => setIsVisible(true), 100);
      setTimeout(() => setItemsVisible(true), 300);
    }
  }, [isLoading, errorMessage]);

  const fetchOrder = useCallback(async () => {
    if (!orderId || isNaN(parseInt(orderId))) {
      setErrorMessage('ID de commande invalide.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.getOrder(orderId, { headers: { 'Cache-Control': 'no-cache' } });
      console.log('Détails de la commande récupérés :', response.data, 'timestamp :', new Date().toISOString());
      debouncedSetOrderDetails(response.data);
      setIsApproved(!!response.data.approved);
      setIsCancelled(response.data.status === 'cancelled');
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching order:', {
        status: error.response?.status,
        message: error.response?.data?.error || error.message,
        timestamp: new Date().toISOString(),
      });
      if (error.response?.status === 403) {
        setErrorMessage('Accès refusé : Vous n\'êtes pas autorisé à voir cette commande.');
      } else if (error.response?.status === 404) {
        setErrorMessage('Commande introuvable.');
      } else if (error.response?.status === 500) {
        setErrorMessage('Erreur du serveur. Veuillez réessayer plus tard.');
      } else {
        setErrorMessage('Échec du chargement des détails de la commande. Vérifiez votre connexion.');
      }
      setIsLoading(false);
    }
  }, [orderId, debouncedSetOrderDetails]);

  const playSound = async () => {
    if (!audioRef.current) {
      console.warn('Audio non initialisé', { timestamp: new Date().toISOString() });
      return;
    }
    if (!hasInteracted.current) {
      console.log('En attente d\'une interaction utilisateur pour jouer le son', { timestamp: new Date().toISOString() });
      const retrySound = () => {
        if (hasInteracted.current && !hasPlayedSound.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch((err) => {
            console.error('Erreur de lecture audio :', err, { timestamp: new Date().toISOString() });
            toast.warn('Le son de confirmation de commande est bloqué par le navigateur.');
          });
          hasPlayedSound.current = true;
          window.removeEventListener('click', retrySound);
          window.removeEventListener('keydown', retrySound);
        }
      };
      window.addEventListener('click', retrySound);
      window.addEventListener('keydown', retrySound);
      return;
    }
    try {
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
      console.log('Son de confirmation de commande joué avec succès', { timestamp: new Date().toISOString() });
      hasPlayedSound.current = true;
    } catch (err) {
      console.error('Échec de la lecture audio :', err, { timestamp: new Date().toISOString() });
      toast.warn('Le son de confirmation de commande est bloqué par le navigateur.');
    }
  };

  const onOrderApproved = useCallback(
    (data) => {
      console.log('OrderWaiting a reçu l\'événement orderApproved :', {
        data,
        expectedOrderId: orderId,
        sessionId,
        timestamp: new Date().toISOString(),
      });
      if (!data.orderId) {
        console.warn('Événement orderApproved invalide : orderId manquant', data, 'timestamp :', new Date().toISOString());
        toast.warn('Données de confirmation de commande invalides reçues');
        return;
      }
      if (parseInt(data.orderId) === parseInt(orderId)) {
        console.log('Traitement de la confirmation de commande pour orderId :', data.orderId, 'timestamp :', new Date().toISOString());
        setIsProcessingApproval(true);
        setIsApproved(true);
        if (!hasPlayedSound.current) {
          playSound();
        }
        if (data.orderDetails && Object.keys(data.orderDetails).length > 0) {
          debouncedSetOrderDetails((prev) => {
            const updatedDetails = {
              ...prev,
              ...data.orderDetails,
              approved: 1,
              status: data.orderDetails?.status || 'en préparation',
            };
            console.log('Détails de la commande mis à jour depuis l\'événement :', updatedDetails, 'timestamp :', new Date().toISOString());
            return updatedDetails;
          });
          setIsLoading(false);
          setIsProcessingApproval(false);
        } else {
          fetchOrder();
          setTimeout(() => setIsProcessingApproval(false), 500);
        }
        toast.success(`Commande #${orderId} a été approuvée !`, { autoClose: 3000 });
      } else {
        console.log('Événement orderApproved ignoré, mismatch orderId :', {
          received: data.orderId,
          expected: orderId,
          timestamp: new Date().toISOString(),
        });
      }
    },
    [orderId, sessionId, debouncedSetOrderDetails, fetchOrder]
  );

  const onOrderUpdate = useCallback(
    (data) => {
      console.log('OrderWaiting a reçu l\'événement orderUpdate :', {
        data,
        expectedOrderId: orderId,
        sessionId,
        timestamp: new Date().toISOString(),
      });
      if (parseInt(data.orderId) === parseInt(orderId)) {
        debouncedSetOrderDetails((prev) => {
          const updatedDetails = {
            ...prev,
            ...data.orderDetails,
            status: data.status || prev?.status || 'reçue',
          };
          console.log('Détails de la commande mis à jour sur orderUpdate :', updatedDetails, 'timestamp :', new Date().toISOString());
          return updatedDetails;
        });
        toast.info(`Commande #${orderId} mise à jour à ${data.status}`, { autoClose: 3000 });
      }
    },
    [orderId, sessionId, debouncedSetOrderDetails]
  );

  const onOrderCancelled = useCallback(
    (data) => {
      console.log('OrderWaiting a reçu l\'événement orderCancelled :', {
        data,
        expectedOrderId: orderId,
        sessionId,
        timestamp: new Date().toISOString(),
      });
      if (!data.orderId) {
        console.warn('Événement orderCancelled invalide : orderId manquant', data, 'timestamp :', new Date().toISOString());
        toast.warn('Données d\'annulation de commande invalides reçues');
        return;
      }
      if (parseInt(data.orderId) === parseInt(orderId)) {
        console.log('Traitement de l\'annulation de commande pour orderId :', data.orderId, 'timestamp :', new Date().toISOString());
        setIsCancelled(true);
        setIsApproved(false);
        if (data.orderDetails && Object.keys(data.orderDetails).length > 0) {
          debouncedSetOrderDetails((prev) => {
            const updatedDetails = {
              ...prev,
              ...data.orderDetails,
              approved: 0,
              status: data.orderDetails?.status || 'cancelled',
            };
            console.log('Détails de la commande mis à jour depuis l\'événement orderCancelled :', updatedDetails, 'timestamp :', new Date().toISOString());
            return updatedDetails;
          });
        } else {
          fetchOrder();
        }
        toast.error(`Commande #${orderId} a été annulée.`, { autoClose: 3000 });
      } else {
        console.log('Événement orderCancelled ignoré, mismatch orderId :', {
          received: data.orderId,
          expected: orderId,
          timestamp: new Date().toISOString(),
        });
      }
    },
    [orderId, sessionId, debouncedSetOrderDetails, fetchOrder]
  );

  useEffect(() => {
    if (!sessionId) {
      console.warn('Aucun ID de session fourni, génération d\'un nouveau', { timestamp: new Date().toISOString() });
      const newSessionId = `guest-${uuidv4()}`;
      setErrorMessage('ID de session manquant. Veuillez réessayer.');
      setIsLoading(false);
      localStorage.setItem('sessionId', newSessionId);
      api.defaults.headers.common['X-Session-Id'] = newSessionId;
      return;
    }

    if (!socket) {
      console.warn('Socket non fourni, en attente d\'initialisation', { sessionId, timestamp: new Date().toISOString() });
      setIsLoading(true);
      return;
    }

    const handleInteraction = () => {
      hasInteracted.current = true;
      console.log('Interaction utilisateur détectée, lecture audio activée', { timestamp: new Date().toISOString() });
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);

    if (isMounted.current) return;
    isMounted.current = true;

    const waitForSocketConnection = (callback, maxAttempts = 10, interval = 1000) => {
      let attempts = 0;
      const checkConnection = setInterval(() => {
        if (socket.connected) {
          console.log('Socket connecté dans OrderWaiting, rejoindre la salle : guest-', sessionId, { timestamp: new Date().toISOString() });
          clearInterval(checkConnection);
          callback();
        } else if (attempts >= maxAttempts) {
          console.error('Délai de connexion socket dépassé', { sessionId, attempts, timestamp: new Date().toISOString() });
          clearInterval(checkConnection);
          setErrorMessage('Impossible de se connecter aux mises à jour en temps réel. Veuillez actualiser la page.');
          setIsLoading(false);
        }
        attempts++;
      }, interval);
    };

    const initializeSocket = () => {
      console.log('Rejoindre la salle socket : guest-', sessionId, { timestamp: new Date().toISOString() });
      socket.emit('join-session', { sessionId: `guest-${sessionId}` });

      socket.on('connect', () => {
        console.log('Socket connecté dans OrderWaiting, rejoindre la salle : guest-', sessionId, { timestamp: new Date().toISOString() });
        socket.emit('join-session', { sessionId: `guest-${sessionId}` });
        if (!isApproved && !isCancelled) fetchOrder();
      });

      socket.on('join-confirmation', (data) => {
        console.log('Confirmation de rejoindre reçue pour la salle : guest-', sessionId, data, { timestamp: new Date().toISOString() });
      });

      socket.on('orderApproved', onOrderApproved);
      socket.on('orderUpdate', onOrderUpdate);
      socket.on('orderCancelled', onOrderCancelled);
      socket.on('connect_error', (error) => {
        console.error('Erreur de connexion socket dans OrderWaiting :', error.message, { timestamp: new Date().toISOString() });
        toast.warn('Connexion aux mises à jour en temps réel perdue. Nouvelle tentative...');
      });

      socket.on('reconnect', (attempt) => {
        console.log('Socket reconnecté dans OrderWaiting après tentative :', attempt, { timestamp: new Date().toISOString() });
        socket.emit('join-session', { sessionId: `guest-${sessionId}` });
        if (!isApproved && !isCancelled) fetchOrder();
      });

      if (!isApproved && !isCancelled) fetchOrder();
    };

    if (socket.connected) {
      initializeSocket();
    } else {
      waitForSocketConnection(initializeSocket);
    }

    const pollInterval = setInterval(() => {
      if (!isApproved && !isCancelled && !isProcessingApproval) {
        console.log('Sondage pour l\'état de la commande :', orderId, 'sessionId :', sessionId, { timestamp: new Date().toISOString() });
        fetchOrder();
      } else {
        console.log('Sondage ignoré : la commande est approuvée, annulée ou en cours d\'approbation', {
          orderId,
          isApproved,
          isCancelled,
          isProcessingApproval,
          timestamp: new Date().toISOString(),
        });
      }
    }, 5000);

    return () => {
      socket.off('connect');
      socket.off('join-confirmation');
      socket.off('orderApproved', onOrderApproved);
      socket.off('orderUpdate', onOrderUpdate);
      socket.off('orderCancelled', onOrderCancelled);
      socket.off('connect_error');
      socket.off('reconnect');
      clearInterval(pollInterval);
      isMounted.current = false;
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      console.log('Nettoyage OrderWaiting terminé pour sessionId :', sessionId, { timestamp: new Date().toISOString() });
    };
  }, [fetchOrder, sessionId, socket, onOrderApproved, onOrderUpdate, onOrderCancelled, isApproved, isCancelled, orderId, isProcessingApproval]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!isApproved && !isCancelled) {
        e.preventDefault();
        e.returnValue = 'Êtes-vous sûr de vouloir quitter ? Le suivi de votre commande sera interrompu.';
      }
    };

    const handlePopState = () => {
      if (!isApproved && !isCancelled) {
        toast.warn('Veuillez attendre l\'approbation ou l\'annulation de votre commande avant de naviguer ailleurs.');
        navigate(`/order-waiting/${orderId}`, { replace: true, state: { sessionId } });
      } else {
        navigate('/');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isApproved, isCancelled, navigate, orderId, sessionId]);

  const handleReturnHome = () => {
    setIsVisible(false);
    setTimeout(() => navigate('/'), 200);
  };

  const handleCopyUrl = () => {
    const currentUrl = window.location.href;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(currentUrl)
        .then(() => {
          console.log('URL copiée dans le presse-papiers :', currentUrl, { timestamp: new Date().toISOString() });
          toast.success('URL de la commande copiée dans le presse-papiers !', { autoClose: 3000 });
        })
        .catch((err) => {
          console.error('Échec de la copie de l\'URL avec l\'API clipboard :', err, { timestamp: new Date().toISOString() });
          fallbackCopy(currentUrl);
        });
    } else {
      console.warn('API Clipboard indisponible, utilisation de la méthode de secours', { timestamp: new Date().toISOString() });
      fallbackCopy(currentUrl);
    }
  };

  const fallbackCopy = (text) => {
    const tempInput = document.createElement('textarea');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        console.log('URL copiée dans le presse-papiers avec la méthode de secours :', text, { timestamp: new Date().toISOString() });
        toast.success('URL de la commande copiée dans le presse-papiers !', { autoClose: 3000 });
      } else {
        console.error('Échec de la copie de secours', { timestamp: new Date().toISOString() });
        toast.error('Échec de la copie de l\'URL. Veuillez essayer manuellement.');
      }
    } catch (err) {
      console.error('Erreur de copie de secours :', err, { timestamp: new Date().toISOString() });
      toast.error('Échec de la copie de l\'URL. Veuillez essayer manuellement.');
    }
    document.body.removeChild(tempInput);
  };

  const handleDownloadFacture = () => {
    if (!factureRef.current) {
      toast.error('Impossible de générer la facture.');
      return;
    }

    html2canvas(factureRef.current, { scale: 2 }).then((canvas) => {
      const link = document.createElement('a');
      link.download = `facture-commande-${orderId}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.click();
      console.log(`Facture téléchargée pour la commande #${orderId}`, { timestamp: new Date().toISOString() });
      toast.success('Facture téléchargée avec succès !', { autoClose: 3000 });
    }).catch((err) => {
      console.error('Erreur lors de la génération de la facture :', err, { timestamp: new Date().toISOString() });
      toast.error('Échec du téléchargement de la facture.');
    });
  };

  const groupedItems = (() => {
    if (!orderDetails) {
      console.log('No order details available for grouping');
      return [];
    }

    const acc = {};

    // Process menu items
    const itemIds = (orderDetails.item_ids?.split(',') || []).filter(id => id?.trim() && !isNaN(parseInt(id)));
    const itemNames = orderDetails.item_names?.split(',') || [];
    const unitPrices = orderDetails.unit_prices?.split(',').map(price => safeParseFloat(price)) || [];
    const menuQuantities = (orderDetails.menu_quantities?.split(',') || []).filter(q => q !== 'NULL' && q?.trim()).map(q => safeParseInt(q, 1));
    const supplementIds = orderDetails.supplement_ids?.split(',') || [];
    const supplementNames = orderDetails.supplement_names?.split(',') || [];
    const supplementPrices = orderDetails.supplement_prices?.split(',').map(price => safeParseFloat(price)) || [];
    const imageUrls = orderDetails.image_urls?.split(',') || [];

    itemIds.forEach((id, idx) => {
      if (idx >= menuQuantities.length || idx >= itemNames.length || idx >= unitPrices.length) return;

      const supplementId = supplementIds[idx]?.trim() || null;
      const key = `${id.trim()}_${supplementId || 'none'}`;
      const quantity = menuQuantities[idx];
      const unitPrice = safeParseFloat(unitPrices[idx], 0);
      const supplementPrice = supplementId ? safeParseFloat(supplementPrices[idx], 0) : 0;
      const basePrice = unitPrice - supplementPrice;

      if (!acc[key]) {
        acc[key] = {
          id: safeParseInt(id, 0),
          type: 'menu',
          name: itemNames[idx]?.trim() || 'Article inconnu',
          quantity: 0,
          basePrice: basePrice,
          unitPrice: unitPrice,
          supplementName: supplementId ? supplementNames[idx]?.trim() || 'Supplément inconnu' : null,
          supplementPrice: supplementPrice,
          imageUrl: imageUrls[idx]?.trim() || null,
          options: [],
        };
      }
      acc[key].quantity = quantity;
      console.log(`Processed menu item: id=${id}, supplementId=${supplementId}, quantity=${quantity}, basePrice=${basePrice}, supplementPrice=${supplementPrice}, key=${key}`);
    });

    // Process breakfast items
    const breakfastIds = (orderDetails.breakfast_ids?.split(',') || []).filter(id => id?.trim() && !isNaN(parseInt(id)));
    const breakfastNames = orderDetails.breakfast_names?.split(',') || [];
    const breakfastQuantities = (orderDetails.breakfast_quantities?.split(',') || []).filter(q => q !== 'NULL' && q?.trim()).map(q => safeParseInt(q, 1));
    const breakfastImages = orderDetails.breakfast_images?.split(',') || [];
    const optionIds = (orderDetails.breakfast_option_ids?.split(',') || []).filter(id => id?.trim() && !isNaN(parseInt(id)));
    const optionNames = orderDetails.breakfast_option_names?.split(',') || [];
    const optionPrices = orderDetails.breakfast_option_prices?.split(',').map(price => safeParseFloat(price)) || [];

    breakfastIds.forEach((id, idx) => {
      if (idx >= breakfastQuantities.length || idx >= breakfastNames.length) return;

      const quantity = breakfastQuantities[idx] || 1;
      const imageUrl = idx < breakfastImages.length ? breakfastImages[idx]?.trim() || null : null;
      const options = [];
      const optionsPerItem = Math.floor(optionIds.length / (breakfastIds.length || 1));
      const startIdx = idx * optionsPerItem;
      const endIdx = (idx + 1) * optionsPerItem;

      let totalOptionPrice = 0;
      for (let i = startIdx; i < endIdx && i < optionIds.length; i++) {
        if (optionIds[i]) {
          const optionPrice = safeParseFloat(optionPrices[i], 0);
          totalOptionPrice += optionPrice;
          options.push({
            name: i < optionNames.length ? optionNames[i]?.trim() || 'Option inconnue' : 'Option inconnue',
            price: optionPrice,
          });
        }
      }

      const key = `${id.trim()}_${options.map(opt => opt.name).join('-') || 'no-options'}`;

      // Get breakfast unit price from unit_prices (offset by menu items length)
      const breakfastUnitPrice = unitPrices.length > itemIds.length ? safeParseFloat(unitPrices[itemIds.length + idx], 0) : 0;
      const basePrice = breakfastUnitPrice - totalOptionPrice;

      if (!acc[key]) {
        acc[key] = {
          id: safeParseInt(id, 0),
          type: 'breakfast',
          name: breakfastNames[idx]?.trim() || 'Petit-déjeuner inconnu',
          quantity: 0,
          basePrice: basePrice,
          unitPrice: breakfastUnitPrice,
          imageUrl: imageUrl,
          options: options,
          supplementName: null,
          supplementPrice: 0,
        };
      }
      acc[key].quantity = quantity;
      console.log(`Processed breakfast item: id=${id}, quantity=${quantity}, basePrice=${basePrice}, totalOptionPrice=${totalOptionPrice}, options=${JSON.stringify(options)}, key=${key}`);
    });

    const items = Object.values(acc).filter(item => item.quantity > 0);
    if (items.length === 0) {
      console.log('No items grouped from orderDetails:', orderDetails);
    }
    return items;
  })();

  if (isLoading) {
    return (
      <div className="order-waiting-container">
        <div className="order-waiting-loader">
          <div className="order-waiting-spinner"></div>
          <h2 className="order-waiting-loader-text">Chargement de la commande</h2>
          <p className="order-waiting-loader-subtext">Veuillez patienter...</p>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="order-waiting-container">
        <div className="order-waiting-error-card">
          <div className="order-waiting-error-icon">
            <div className="order-waiting-error-circle">
              <div className="order-waiting-error-dot"></div>
            </div>
          </div>
          <h2 className="order-waiting-error-title">{errorMessage}</h2>
          <button onClick={handleReturnHome} className="order-waiting-button">
            <Home sx={{ fontSize: 18, marginRight: '6px' }} />
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  if (!orderDetails) {
    return (
      <div className="order-waiting-container">
        <div className="order-waiting-error-card">
          <div className="order-waiting-error-icon">
            <div className="order-waiting-error-circle">
              <div className="order-waiting-error-dot"></div>
            </div>
          </div>
          <h2 className="order-waiting-error-title">Détails de la commande indisponibles</h2>
          <p className="order-waiting-error-subtext">Veuillez réessayer plus tard ou contacter le support.</p>
          <button onClick={handleReturnHome} className="order-waiting-button">
            <Home sx={{ fontSize: 18, marginRight: '6px' }} />
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  const getOrderTypeDisplay = (orderType) => {
    switch (orderType) {
      case 'local':
        return `Tableau ${orderDetails.table_number || 'N/A'}`;
      case 'delivery':
        return 'Livraison';
      case 'imported':
        return 'À emporter';
      default:
        return 'Inconnu';
    }
  };

  const currentUrl = window.location.href;
  const orderTime = new Date(orderDetails.created_at || Date.now()).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="order-waiting-container">
      <div className={`order-waiting-header ${isVisible ? 'visible' : ''} ${isApproved ? 'approved' : isCancelled ? 'cancelled' : ''}`}>
        <h1 className="order-waiting-header-title">
          {isCancelled ? 'Commande annulée' : isApproved ? 'Commande confirmée !' : 'En attente de confirmation'}
        </h1>
        <p className="order-waiting-header-subtitle">
          Commande #{orderId} • {getOrderTypeDisplay(orderDetails.order_type)} • Statut : {orderDetails.status || 'reçue'}
        </p>
      </div>

      <div className={`order-waiting-card ${isVisible ? 'visible' : ''}`}>
        <div className="order-waiting-status-section">
          <div className={isCancelled ? 'order-waiting-status-cancelled' : isApproved ? 'order-waiting-status-approved' : 'order-waiting-status-pending'}>
            <span className="order-waiting-status-text">
              {isProcessingApproval
                ? 'Traitement de l\'approbation...'
                : isCancelled
                ? 'Commande annulée'
                : isApproved
                ? 'Commande approuvée'
                : 'En attente d\'approbation'}
            </span>
          </div>
          <p className="order-waiting-status-message">
            {isProcessingApproval
              ? 'Votre commande est en cours de confirmation.'
              : isCancelled
              ? 'Votre commande a été annulée. Veuillez contacter le support pour plus d\'informations.'
              : isApproved
              ? 'Votre commande a été confirmée et est en préparation.'
              : 'Votre commande est en cours d\'examen par notre personnel.'}
          </p>
        </div>

        {orderDetails.delivery_address && (
          <div className="order-waiting-alert">
            <LocationOn sx={{ fontSize: 18, color: '#f59e0b', flexShrink: 0 }} />
            <div>
              <div className="order-waiting-alert-title">Commande de livraison</div>
              <div className="order-waiting-alert-text">{orderDetails.delivery_address}</div>
            </div>
          </div>
        )}

        {orderDetails.notes && (
          <div className="order-waiting-alert order-waiting-notes-alert">
            <Note sx={{ fontSize: 18, color: '#3b82f6', flexShrink: 0 }} />
            <div>
              <div className="order-waiting-alert-title">Instructions spéciales</div>
              <div className="order-waiting-alert-text">{orderDetails.notes}</div>
            </div>
          </div>
        )}

        <div className="order-waiting-items-section">
          <h2 className="order-waiting-section-title">Votre commande</h2>
          <div className="order-waiting-items">
            {groupedItems.length > 0 ? (
              groupedItems.map((item, index) => {
                const imageUrl = item.imageUrl && item.imageUrl !== 'null' ? item.imageUrl : '/placeholder.jpg';
                const totalItemPrice = item.unitPrice * item.quantity;

                return (
                  <div
                    key={`${item.type}-${item.id}-${index}`}
                    className={`order-waiting-item-row ${itemsVisible ? 'visible' : ''}`}
                    style={{ transitionDelay: `${index * 0.1}s` }}
                  >
                    <img
                      src={imageUrl}
                      alt={item.name}
                      className="order-waiting-item-image"
                      onError={(e) => {
                        console.error(`Erreur lors du chargement de l'image de l'article (${item.type}):`, item.imageUrl);
                        e.target.src = '/placeholder.jpg';
                      }}
                    />
                    <div className="order-waiting-item-details">
                      <span className="order-waiting-item-name">{item.name}</span>
                      <div className="order-waiting-item-price-breakdown">
                        <div className="order-waiting-base-price">
                          {item.basePrice.toFixed(2)} {currency}
                        </div>
                        {item.type === 'menu' && item.supplementName && item.supplementPrice > 0 && (
                          <div className="order-waiting-supplement-price">
                            + {item.supplementName}: {item.supplementPrice.toFixed(2)} {currency}
                          </div>
                        )}
                        {item.type === 'breakfast' && item.options && item.options.length > 0 && (
                          <div className="order-waiting-breakfast-options">
                            {item.options.map((opt, optIdx) => (
                              <div key={optIdx} className="order-waiting-option-price">
                                + {opt.name}: {opt.price.toFixed(2)} {currency}
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="order-waiting-item-total">
                          {item.unitPrice.toFixed(2)} {currency} × {item.quantity} = {totalItemPrice.toFixed(2)} {currency}
                        </div>
                      </div>
                    </div>
                    <span className="order-waiting-quantity-badge">{item.quantity}</span>
                  </div>
                );
              })
            ) : (
              <div className="order-waiting-no-items">Aucun article dans cette commande.</div>
            )}
          </div>
        </div>

        <div className="order-waiting-total-section">
          <div className="order-waiting-total-row">
            <span className="order-waiting-total-label">Total</span>
            <span className="order-waiting-total-value">{safeParseFloat(orderDetails.total_price || 0).toFixed(2)} {currency}</span>
          </div>
        </div>
      </div>

      {/* Hidden Facture for Download */}
      <div ref={factureRef} style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '400px', padding: '20px', backgroundColor: '#fff', fontFamily: 'Arial, sans-serif', color: '#000', border: '1px solid #000' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '10px' }}>Facture #{orderId}</h2>
        <p style={{ marginBottom: '10px' }}>Heure: {orderTime}</p>
        <hr style={{ border: 'none', borderTop: '1px dashed #000', margin: '10px 0' }} />
        {groupedItems.map((item, index) => (
          <div key={index} style={{ margin: '10px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{item.quantity}x {item.name}</span>
              <span>{(item.basePrice * item.quantity).toFixed(2)} {currency}</span>
            </div>
            {item.type === 'menu' && item.supplementName && item.supplementPrice > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginLeft: '20px', fontSize: '14px', color: '#555' }}>
                <span>+ {item.supplementName}</span>
                <span>{(item.supplementPrice * item.quantity).toFixed(2)} {currency}</span>
              </div>
            )}
            {item.type === 'breakfast' && item.options && item.options.length > 0 && (
              <div style={{ marginLeft: '20px', fontSize: '14px', color: '#555' }}>
                {item.options.map((opt, optIdx) => (
                  <div key={optIdx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>+ {opt.name}</span>
                    <span>{(opt.price * item.quantity).toFixed(2)} {currency}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginTop: '5px' }}>
              <span>Total</span>
              <span>{(item.unitPrice * item.quantity).toFixed(2)} {currency}</span>
            </div>
          </div>
        ))}
        <hr style={{ border: 'none', borderTop: '1px dashed #000', margin: '10px 0' }} />
        <p style={{ fontWeight: 'bold', textAlign: 'right' }}>TOTAL: {safeParseFloat(orderDetails.total_price || 0).toFixed(2)} {currency}</p>
      </div>

      <div className="order-waiting-url-section">
        <p className="order-waiting-url-text">URL de la commande actuelle :</p>
        <p className="order-waiting-url-value" title={currentUrl}>{currentUrl}</p>
        <p className="order-waiting-instruction">
          Veuillez sauvegarder cette URL pour suivre l'état de votre commande ultérieurement, par exemple, lors du paiement ou pour vérifier les mises à jour. Nous vous recommandons de la copier dans un endroit sécurisé pour votre commodité.
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={handleCopyUrl} className="order-waiting-button">
            <ContentCopy sx={{ fontSize: 16, marginRight: '6px' }} />
            Copier l'URL
          </button>
          <button onClick={handleDownloadFacture} className="order-waiting-button">
            <Download sx={{ fontSize: 16, marginRight: '6px' }} />
            Télécharger la facture
          </button>
        </div>
      </div>

      <button onClick={handleReturnHome} className="order-waiting-button order-waiting-home-button">
        <Home sx={{ fontSize: 18, marginRight: '6px' }} />
        Retour à l'accueil
      </button>
    </div>
  );
}

export default OrderWaiting;
