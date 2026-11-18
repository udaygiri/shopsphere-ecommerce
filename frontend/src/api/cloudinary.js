import axios from 'axios';

/**
 * Upload an image file directly to Cloudinary using an unsigned upload preset.
 * 
 * @param {File} file - The file object from <input type="file" />
 * @param {Function} onProgress - Optional callback for upload progress (0 to 100)
 * @returns {Promise<string>} - Resolves with the secure HTTPS image URL from Cloudinary
 */
export const uploadImageToCloudinary = async (file, onProgress) => {
  if (!file) {
    throw new Error('No image file selected for upload.');
  }

  // Retrieve Cloudinary config from Vite environment variables
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  // Validation: Check if environment variables are populated
  if (!cloudName || !uploadPreset || cloudName === 'your_cloud_name' || uploadPreset === 'your_upload_preset') {
    throw new Error(
      'Cloudinary not configured. Please set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in frontend/.env'
    );
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  try {
    const response = await axios.post(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });

    if (response.data && response.data.secure_url) {
      return response.data.secure_url;
    }

    throw new Error('Cloudinary response did not contain a secure_url.');
  } catch (error) {
    const errorMessage =
      error.response?.data?.error?.message ||
      error.message ||
      'Failed to upload image to Cloudinary.';
    throw new Error(errorMessage);
  }
};

export default uploadImageToCloudinary;
