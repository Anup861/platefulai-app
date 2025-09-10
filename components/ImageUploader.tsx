
import React, { useState, useRef, useCallback } from 'react';
import { CameraIcon, UploadIcon } from './icons';

interface ImageUploaderProps {
  onImageSelect: (base64Image: string) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelect }) => {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageSelect(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const openCamera = useCallback(async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        setIsCameraOpen(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        alert("Could not access the camera. Please ensure you've granted permission.");
      }
    }
  }, []);

  const closeCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  }, []);

  const takePicture = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUrl = canvas.toDataURL('image/jpeg');
        onImageSelect(dataUrl);
        closeCamera();
      }
    }
  }, [onImageSelect, closeCamera]);

  if (isCameraOpen) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <video ref={videoRef} autoPlay playsInline className="w-full h-auto rounded-lg mb-4"></video>
        <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
        <div className="flex justify-around">
          <button onClick={takePicture} className="px-6 py-2 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 transition">Capture</button>
          <button onClick={closeCamera} className="px-6 py-2 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-600 transition">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <div className="flex flex-col md:flex-row gap-4">
        <label htmlFor="file-upload" className="flex-1 cursor-pointer">
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg h-full text-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <UploadIcon className="w-12 h-12 text-gray-400 mb-2" />
            <span className="font-semibold text-lg text-gray-700 dark:text-gray-300">Upload a Photo</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">or drag and drop</span>
          </div>
          <input id="file-upload" name="file-upload" type="file" accept="image/*" className="sr-only" onChange={handleFileChange} />
        </label>
        
        <div className="flex items-center md:flex-col">
            <hr className="w-full md:w-px md:h-full border-gray-200 dark:border-gray-600"/>
            <span className="px-2 text-sm text-gray-400 bg-white dark:bg-gray-800">OR</span>
            <hr className="w-full md:w-px md:h-full border-gray-200 dark:border-gray-600"/>
        </div>

        <button onClick={openCamera} className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <CameraIcon className="w-12 h-12 text-gray-400 mb-2" />
          <span className="font-semibold text-lg text-gray-700 dark:text-gray-300">Use Camera</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">to snap ingredients</span>
        </button>
      </div>
    </div>
  );
};

export default ImageUploader;
