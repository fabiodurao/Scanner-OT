import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePhotoAnalysisJobs } from '@/contexts/PhotoAnalysisJobsContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, Upload, Loader2, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const SUPABASE_PROJECT_ID = 'jgclhfwigmxmqyhqngcm';

// Extract EXIF timestamp from image
const extractExifTimestamp = async (_file: File): Promise<string | null> => {
  try {
    // This is a simplified version - in production you'd use a library like exif-js
    // For now, we'll just return null and use upload time
    return null;
  } catch {
    return null;
  }
};

// Convert image file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export function PhotoAnalysisButton({ siteId }: { siteId: string }) {
  const { activeJobs } = usePhotoAnalysisJobs();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<'select' | 'camera' | 'upload'>('select');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoTimestamp, setPhotoTimestamp] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isRunning = activeJobs.some(job => job.site_identifier === siteId);

  // Cleanup camera stream when dialog closes or mode changes
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const handleOpenDialog = () => {
    setDialogOpen(true);
    setMode('select');
    setPhotoPreview(null);
    setPhotoFile(null);
    setPhotoTimestamp(null);
  };

  const handleCloseDialog = () => {
    // Stop camera if active
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setDialogOpen(false);
    setMode('select');
    setPhotoPreview(null);
    setPhotoFile(null);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Prefer back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      setMode('camera');
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Could not access camera. Please check permissions.');
      setMode('select');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0);
    
    // Convert to blob
    canvas.toBlob((blob) => {
      if (!blob) return;
      
      const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
      const preview = canvas.toDataURL('image/jpeg', 0.9);
      
      setPhotoFile(file);
      setPhotoPreview(preview);
      setPhotoTimestamp(new Date().toISOString());
      
      // Stop camera
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      setMode('upload');
    }, 'image/jpeg', 0.9);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image too large. Maximum size is 10MB.');
      return;
    }
    
    const preview = await fileToBase64(file);
    const timestamp = await extractExifTimestamp(file);
    
    setPhotoFile(file);
    setPhotoPreview(preview);
    setPhotoTimestamp(timestamp || new Date().toISOString());
    setMode('upload');
  };

  const handleSubmit = async () => {
    if (!photoFile || !photoPreview) return;
    
    setSubmitting(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated');
        setSubmitting(false);
        return;
      }

      const response = await fetch(
        `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/trigger-photo-analysis`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            siteIdentifier: siteId,
            photoData: photoPreview,
            photoTimestamp: photoTimestamp,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || 'Failed to start photo analysis');
        setSubmitting(false);
        return;
      }

      toast.success('Photo analysis started! Processing image...');
      
      setTimeout(() => {
        toast.info("You'll be notified when analysis completes", {
          duration: 3000,
        });
      }, 1000);
      
      handleCloseDialog();
      setSubmitting(false);
      
    } catch (error) {
      console.error('Error submitting photo:', error);
      toast.error('Failed to submit photo');
      setSubmitting(false);
    }
  };

  const handleRetake = () => {
    setPhotoPreview(null);
    setPhotoFile(null);
    setMode('select');
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={handleOpenDialog}
        disabled={isRunning}
        className={cn(
          "relative overflow-hidden transition-all",
          isRunning && "border-pink-400 bg-pink-50"
        )}
      >
        {isRunning ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Analyzing Photo...
          </>
        ) : (
          <>
            <Camera className="h-4 w-4 mr-2" />
            Photo Analysis
          </>
        )}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Photo Analysis</DialogTitle>
            <DialogDescription>
              Take or upload a photo of the equipment display to identify variable labels and units
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {mode === 'select' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Button
                  variant="outline"
                  className="h-32 flex flex-col gap-2"
                  onClick={startCamera}
                >
                  <Camera className="h-8 w-8 text-[#2563EB]" />
                  <span className="font-medium">Take Photo</span>
                  <span className="text-xs text-muted-foreground">Use device camera</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-32 flex flex-col gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-8 w-8 text-[#2563EB]" />
                  <span className="font-medium">Upload Photo</span>
                  <span className="text-xs text-muted-foreground">Select from gallery</span>
                </Button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            )}

            {mode === 'camera' && (
              <div className="space-y-4">
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-auto"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={capturePhoto} className="flex-1 bg-[#2563EB]">
                    <Camera className="h-4 w-4 mr-2" />
                    Capture
                  </Button>
                  <Button variant="outline" onClick={handleRetake}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {mode === 'upload' && photoPreview && (
              <div className="space-y-4">
                <div className="relative border rounded-lg overflow-hidden bg-slate-50">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-full h-auto max-h-96 object-contain"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 bg-white/90 hover:bg-white"
                    onClick={handleRetake}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                  <div className="flex items-start gap-2">
                    <ImageIcon className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-blue-900">Ready to analyze</div>
                      <div className="text-blue-700 text-xs mt-1">
                        The AI will extract values from the photo and match them with historical data 
                        to identify variable labels, units, and scaling factors.
                      </div>
                      {photoTimestamp && (
                        <div className="text-blue-600 text-xs mt-2">
                          Photo timestamp: {new Date(photoTimestamp).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            {mode === 'upload' && photoPreview && (
              <>
                <Button variant="outline" onClick={handleRetake}>
                  Retake
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={submitting}
                  className="bg-[#2563EB] hover:bg-[#1d4ed8]"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4 mr-2" />
                      Analyze Photo
                    </>
                  )}
                </Button>
              </>
            )}
          </DialogFooter>

          {/* Hidden canvas for photo capture */}
          <canvas ref={canvasRef} className="hidden" />
        </DialogContent>
      </Dialog>
    </>
  );
}