import { supabase } from '@/lib/supabase';

export async function uploadImage(file: File, folder: string): Promise<string | null> {
  const ext = file.name.split('.').pop() || 'jpg';
  const safeExt = ext.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'jpg';
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${safeExt}`;
  const { error } = await supabase.storage
    .from('media')
    .upload(path, file, { contentType: file.type || 'image/*', upsert: false });
  if (error) {
    console.error('Image upload failed:', error);
    return null;
  }
  const { data } = supabase.storage.from('media').getPublicUrl(path);
  return data.publicUrl;
}
