import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import CloseIcon from '@mui/icons-material/Close';

function SupplementPopup({ item, supplements, onSelect, onSkip }) {
  const [selectedSupplement, setSelectedSupplement] = useState('0');
  const [isLoading, setLoading] = useState(false);

  const handleConfirm = () => {
    setLoading(true);
    const supplement = selectedSupplement !== '0'
      ? supplements.find(s => s.supplement_id === parseInt(selectedSupplement))
      : null;
    onSelect(supplement ? { 
      supplement_id: supplement.supplement_id, 
      additional_price: parseFloat(supplement.additional_price) || 0, 
      name: supplement.name 
    } : null);
    setLoading(false);
  };

  const handleSkip = () => {
    setLoading(true);
    onSkip();
    setLoading(false);
  };

  const handleClose = () => {
    onSkip();
  };

  return (
    <div className="modal-overlay">
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.3s cubic-bezier(0.32, 0.72, 0, 1);
        }
        .popup-content {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(30px);
          -webkit-backdrop-filter: blur(30px);
          width: 90%;
          max-width: 400px;
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
          animation: slideUp 0.4s cubic-bezier(0.32, 0.72, 0, 1);
        }
        .popup-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .popup-title {
          font-size: 20px;
          font-weight: 700;
          color: #1d1d1f;
          margin: 0;
          letter-spacing: -0.02em;
        }
        .close-button {
          background: rgba(142, 142, 147, 0.12);
          border: none;
          border-radius: 16px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.32, 0.72, 0, 1);
        }
        .close-button:hover {
          background: rgba(142, 142, 147, 0.2);
          transform: scale(1.1);
        }
        .close-button:active {
          transform: scale(0.95);
        }
        .popup-body {
          margin-bottom: 24px;
        }
        .item-name {
          font-size: 17px;
          font-weight: 600;
          color: #1d1d1f;
          margin-bottom: 12px;
        }
        .supplement-select {
          width: 100%;
          padding: 12px 16px;
          border-radius: 12px;
          border: 1px solid rgba(0, 0, 0, 0.06);
          font-size: 15px;
          color: #1d1d1f;
          background: rgba(255, 255, 255, 0.8);
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2386868b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
          background-position: right 16px center;
          background-repeat: no-repeat;
          background-size: 16px;
          transition: all 0.2s cubic-bezier(0.32, 0.72, 0, 1);
        }
        .supplement-select:focus {
          outline: none;
          box-shadow: 0 0 0 4px rgba(0, 122, 255, 0.15);
        }
        .loading-text {
          text-align: center;
          color: #86868b;
          font-size: 15px;
        }
        .popup-actions {
          display: flex;
          gap: 12px;
        }
        .btn-primary {
          flex: 1;
          background: linear-gradient(135deg, #007aff, #0051d0);
          color: white;
          border: none;
          padding: 14px 20px;
          border-radius: 16px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.32, 0.72, 0, 1);
          box-shadow: 0 4px 16px rgba(0, 122, 255, 0.4);
        }
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(0, 122, 255, 0.5);
        }
        .btn-primary:disabled {
          background: #d1d5db;
          cursor: not-allowed;
          box-shadow: none;
        }
        .btn-primary:active:not(:disabled) {
          transform: scale(0.95);
        }
        .btn-secondary {
          flex: 1;
          background: rgba(255, 255, 255, 0.8);
          color: #007aff;
          border: 1px solid rgba(0, 122, 255, 0.3);
          padding: 14px 20px;
          border-radius: 16px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.32, 0.72, 0, 1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }
        .btn-secondary:disabled {
          background: rgba(142, 142, 147, 0.3);
          color: #8e8e93;
          cursor: not-allowed;
          box-shadow: none;
        }
        .btn-secondary:hover:not(:disabled) {
          background: rgba(240, 248, 255, 0.9);
          transform: translateY(-1px);
        }
        .btn-secondary:active:not(:disabled) {
          transform: scale(0.95);
        }
        @media (max-width: 480px) {
          .popup-content {
            width: 95%;
            padding: 16px;
          }
          .popup-title {
            font-size: 18px;
          }
          .item-name {
            font-size: 15px;
          }
          .supplement-select {
            padding: 10px 14px;
            font-size: 14px;
          }
          .btn-primary, .btn-secondary {
            padding: 12px 16px;
            font-size: 14px;
          }
        }
      `}</style>
      <div className="popup-content" onClick={(e) => e.stopPropagation()}>
        <div className="popup-header">
          <h2 className="popup-title">Select Supplement</h2>
          <button className="close-button" onClick={handleClose} aria-label="Close supplement popup">
            <CloseIcon fontSize="small" />
          </button>
        </div>
        <div className="popup-body">
          <p className="item-name">For: {item.name}</p>
          {isLoading ? (
            <p className="loading-text">Processing...</p>
          ) : (
            <select
              value={selectedSupplement}
              onChange={(e) => setSelectedSupplement(e.target.value)}
              className="supplement-select"
              aria-label={`Select supplement for ${item.name}`}
            >
              <option value="0">No Supplement</option>
              {supplements.map(supplement => (
                <option key={supplement.supplement_id} value={supplement.supplement_id}>
                  {supplement.name} (+${parseFloat(supplement.additional_price).toFixed(2)})
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="popup-actions">
          <button
            className="btn-primary"
            onClick={handleConfirm}
            disabled={isLoading}
            aria-label="Confirm supplement selection"
          >
            Confirm
          </button>
          <button
            className="btn-secondary"
            onClick={handleSkip}
            disabled={isLoading}
            aria-label="Skip supplement"
          >
            No Thanks
          </button>
        </div>
      </div>
    </div>
  );
}

export default SupplementPopup;