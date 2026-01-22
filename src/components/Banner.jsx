import { useNavigate } from 'react-router-dom';

function Banner({ banner }) {
  const navigate = useNavigate();

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
      {banner.image_url && (
        <img
          src={banner.image_url} // Use image_url directly without prefixing
          alt="Banner"
          style={{
            width: '100%',
            height: 'auto',
            borderRadius: '8px',
            objectFit: 'cover',
          }}
          onError={(e) => console.error('Error loading banner image:', banner.image_url)} // Debug log for image loading errors
        />
      )}
    </div>
  );
}

export default Banner;
