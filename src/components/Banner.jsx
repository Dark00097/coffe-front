import { useNavigate } from 'react-router-dom';

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm', '.m4v', '.avi', '.mkv', '.wmv', '.flv', '.mpeg', '.mpg'];

const isVideoBanner = (url) => {
  if (!url || typeof url !== 'string') return false;
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('/video/upload/')) {
    return true;
  }

  const cleanUrl = lowerUrl.split('?')[0];
  return VIDEO_EXTENSIONS.some((extension) => cleanUrl.endsWith(extension));
};

function Banner({ banner }) {
  const navigate = useNavigate();
  const mediaUrl = banner?.image_url || '';
  const isVideo = isVideoBanner(mediaUrl);

  const handleClick = () => {
    if (banner.link) {
      // Check if the link is an external URL
      if (banner.link.startsWith('http')) {
        window.location.href = banner.link;
      } else {
        navigate(banner.link);
      }
    }
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '1200px',
        margin: '20px auto',
        cursor: banner.link ? 'pointer' : 'default',
      }}
      onClick={handleClick}
    >
      {mediaUrl && (
        isVideo ? (
          <video
            src={mediaUrl}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            style={{
              width: '100%',
              height: 'auto',
              borderRadius: '8px',
              objectFit: 'cover',
              display: 'block',
            }}
            onError={() => console.error('Error loading banner video:', mediaUrl)}
          />
        ) : (
          <img
            src={mediaUrl}
            alt="Banner"
            style={{
              width: '100%',
              height: 'auto',
              borderRadius: '8px',
              objectFit: 'cover',
            }}
            onError={() => console.error('Error loading banner image:', mediaUrl)}
          />
        )
      )}
    </div>
  );
}

export default Banner;

