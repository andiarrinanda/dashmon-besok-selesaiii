import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import "https://deno.land/x/xhr@0.1.0/mod.ts";
// Ubah kode yang salah di bawah ini
// declare const XLSX: any;
// if (typeof XLSX === 'undefined') {
//   await import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs');
// }
// Menjadi:
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = "https://vzpyamvunnhlzypzdbpf.supabase.co";
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  console.log('📝 Dispatcher: Processing report upload request...');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const indicatorType = formData.get('indicator_type') as string;

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Dispatcher: Processing file: ${file.name}, size: ${file.size}, type: ${file.type}`);

    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid file type. Please upload an Excel file (.xlsx or .xls)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    // Baris ini sekarang akan berfungsi karena XLSX sudah diimpor
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log('📊 Dispatcher: Excel file parsed successfully');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${timestamp}_${file.name}`;
    const filePath = `uploads/${user.id}/${fileName}`;

    console.log(`☁️ Dispatcher: Uploading file to storage: ${filePath}`);
    const { error: uploadError } = await supabase.storage
      .from('report-uploads')
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('❌ Dispatcher: Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: `Upload failed: ${uploadError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('💾 Dispatcher: Creating report entry in database...');
    const { data: reportData, error: dbError } = await supabase
      .from('reports')
      .insert({
        user_id: user.id,
        file_name: file.name,
        file_path: filePath,
        indicator_type: indicatorType,
        status: 'queued',
        raw_data: rawData
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ Dispatcher: Database error:', dbError);
      
      await supabase.storage
        .from('report-uploads')
        .remove([filePath]);
      
      return new Response(
        JSON.stringify({ error: `Database error: ${dbError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Dispatcher: Report created successfully with ID: ${reportData.id}`);

    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        type: 'success', 
        title: 'Laporan Masuk Antrian',
        message: `Laporan "${file.name}" telah masuk ke antrian dan akan diproses oleh sistem dalam beberapa menit.`,
        related_report_id: reportData.id
      });

    if (notificationError) {
      console.error('⚠️ Dispatcher: Notification creation error:', notificationError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Laporan berhasil diunggah dan dimasukkan ke antrian untuk diproses.',
        report_id: reportData.id,
        status: 'queued'
      }),
      { 
        status: 202,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('💥 Dispatcher: Processing error:', error);
    return new Response(
      JSON.stringify({ error: `Processing failed: ${error.message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});