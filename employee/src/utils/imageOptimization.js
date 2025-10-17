/**
 * 🖼️ IMAGE OPTIMIZATION UTILITIES
 * Compression, resizing, and lazy loading helpers for images
 */

import { logger } from './logger.js';

/**
 * Compress image file to reduce size
 * @param {File} file - Image file to compress
 * @param {Object} options - Compression options
 * @returns {Promise<string>} Base64 encoded compressed image
 */
export const compressImage = async (file, options = {}) => {
  const {
    maxSizeMB = 0.2,        // Max size in MB (200KB default)
    maxWidthOrHeight = 800,  // Max dimension
    quality = 0.8,           // Quality (0-1)
    fileType = 'image/jpeg'  // Output format
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        try {
          // Calculate new dimensions
          let width = img.width;
          let height = img.height;

          if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
            if (width > height) {
              height = Math.round((height * maxWidthOrHeight) / width);
              width = maxWidthOrHeight;
            } else {
              width = Math.round((width * maxWidthOrHeight) / height);
              height = maxWidthOrHeight;
            }
          }

          // Create canvas and draw resized image
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to base64 with compression
          const compressedBase64 = canvas.toDataURL(fileType, quality);

          // Check if compressed size is within limit
          const compressedSizeKB = Math.round((compressedBase64.length * 3) / 4 / 1024);
          logger.log(`Image compressed: ${Math.round(file.size / 1024)}KB → ${compressedSizeKB}KB`);

          // If still too large, reduce quality further
          if (compressedSizeKB > maxSizeMB * 1024 && quality > 0.5) {
            logger.warn('Image still too large, reducing quality...');
            compressImage(file, { ...options, quality: quality - 0.1 })
              .then(resolve)
              .catch(reject);
            return;
          }

          resolve(compressedBase64);
        } catch (error) {
          logger.error('Error compressing image:', error);
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = event.target.result;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Validate image file
 * @param {File} file - File to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result { valid, error }
 */
export const validateImageFile = (file, options = {}) => {
  const {
    maxSizeMB = 10,
    allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  } = options;

  // Check if file exists
  if (!file) {
    return { valid: false, error: 'No file selected' };
  }

  // Check file type
  if (!allowedTypes.includes(file.type.toLowerCase())) {
    return { 
      valid: false, 
      error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` 
    };
  }

  // Check file size
  if (file.size > maxSizeMB * 1024 * 1024) {
    return { 
      valid: false, 
      error: `File size exceeds ${maxSizeMB}MB limit` 
    };
  }

  return { valid: true, error: null };
};

/**
 * Convert image to WebP format for better compression
 * @param {string} base64Image - Base64 encoded image
 * @returns {Promise<string>} WebP base64 image
 */
export const convertToWebP = async (base64Image) => {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      // Convert to WebP with quality 0.8
      try {
        const webpBase64 = canvas.toDataURL('image/webp', 0.8);
        resolve(webpBase64);
      } catch (error) {
        // WebP not supported, return original
        logger.warn('WebP not supported, using original format');
        resolve(base64Image);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for WebP conversion'));
    };

    img.src = base64Image;
  });
};

/**
 * Generate thumbnail from image
 * @param {string} base64Image - Base64 encoded image
 * @param {number} size - Thumbnail size (width/height)
 * @returns {Promise<string>} Thumbnail base64 image
 */
export const generateThumbnail = async (base64Image, size = 100) => {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext('2d');

      // Calculate crop dimensions (center crop)
      const srcSize = Math.min(img.width, img.height);
      const sx = (img.width - srcSize) / 2;
      const sy = (img.height - srcSize) / 2;

      ctx.drawImage(img, sx, sy, srcSize, srcSize, 0, 0, size, size);

      const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
      resolve(thumbnail);
    };

    img.onerror = () => {
      reject(new Error('Failed to generate thumbnail'));
    };

    img.src = base64Image;
  });
};

/**
 * Lazy load image with placeholder
 * @param {HTMLImageElement} imgElement - Image element to lazy load
 * @param {string} placeholder - Placeholder image URL
 */
export const setupLazyLoading = (imgElement, placeholder = null) => {
  if (!imgElement) return;

  // Set placeholder if provided
  if (placeholder) {
    imgElement.src = placeholder;
  }

  // Use Intersection Observer for lazy loading
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const src = img.dataset.src;

        if (src) {
          img.src = src;
          img.removeAttribute('data-src');
          observer.unobserve(img);
        }
      }
    });
  });

  observer.observe(imgElement);
};

/**
 * React Hook: useLazyImage
 * Lazy load images in React components
 * 
 * @param {string} src - Image source
 * @param {string} placeholder - Placeholder image
 * @returns {Object} { imgSrc, imgRef, loading }
 * 
 * @example
 * const { imgSrc, imgRef, loading } = useLazyImage(employee.profilePicture, '/placeholder.jpg');
 * <img ref={imgRef} src={imgSrc} alt="Profile" loading="lazy" />
 */
export const useLazyImage = (src, placeholder = null) => {
  const [imgSrc, setImgSrc] = React.useState(placeholder || '');
  const [loading, setLoading] = React.useState(true);
  const imgRef = React.useRef(null);

  React.useEffect(() => {
    if (!src) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setImgSrc(src);
          setLoading(false);
          observer.disconnect();
        }
      });
    });

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src]);

  return { imgSrc, imgRef, loading };
};

/**
 * Get file size in human-readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Preload image
 * @param {string} src - Image source URL
 * @returns {Promise<void>}
 */
export const preloadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to preload image: ${src}`));
    img.src = src;
  });
};

/**
 * Batch preload multiple images
 * @param {string[]} srcs - Array of image URLs
 * @returns {Promise<void[]>}
 */
export const preloadImages = (srcs) => {
  return Promise.all(srcs.map(preloadImage));
};

export default {
  compressImage,
  validateImageFile,
  convertToWebP,
  generateThumbnail,
  setupLazyLoading,
  formatFileSize,
  preloadImage,
  preloadImages
};
