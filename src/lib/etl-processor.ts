import { supabase } from '@/integrations/supabase/client';

interface MediaItem {
  original_url: string;
  final_url?: string;
  media_type: string;
  content_hash?: string;
  is_valid: boolean;
  is_duplicate: boolean;
  validation_error?: string;
  metadata?: any;
}

interface ValidationResult {
  original_url: string;
  final_url: string;
  status_code: number;
  content_hash: string;
  is_duplicate_url: boolean;
  is_duplicate_content: boolean;
}

class ETLProcessor {
  private static HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/115.0.0.0 Safari/537.36'
  };

  // Resolve redirects and get final URL
  private static async resolveFinalUrl(url: string): Promise<{ finalUrl: string; statusCode: number; content: ArrayBuffer }> {
    try {
      const response = await fetch(url, {
        headers: this.HEADERS,
        redirect: 'follow',
        signal: AbortSignal.timeout(15000) // 15 second timeout
      });

      const content = await response.arrayBuffer();
      return {
        finalUrl: response.url,
        statusCode: response.status,
        content
      };
    } catch (error) {
      console.error('Error resolving URL:', url, error);
      return {
        finalUrl: url,
        statusCode: 500,
        content: new ArrayBuffer(0)
      };
    }
  }

  // Generate content hash
  private static async generateHash(content: ArrayBuffer): Promise<string> {
    if (!content || content.byteLength === 0) return '';
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', content);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Normalize URL for duplicate detection
  private static normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`;
    } catch {
      return url;
    }
  }

  // Convert Google Drive viewer to direct download
  private static getDirectDownloadUrl(url: string): string {
    const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^\/]+)/);
    if (driveMatch) {
      const fileId = driveMatch[1];
      return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
    return url;
  }

  // Validate and process URLs
  private static async validateUrls(urls: string[]): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const seenHashes = new Set<string>();
    const urlCounts = new Map<string, number>();

    // First pass: count normalized URLs
    for (const url of urls) {
      const normalized = this.normalizeUrl(url);
      urlCounts.set(normalized, (urlCounts.get(normalized) || 0) + 1);
    }

    // Second pass: process each URL
    for (const url of urls) {
      try {
        const processedUrl = this.getDirectDownloadUrl(url);
        const { finalUrl, statusCode, content } = await this.resolveFinalUrl(processedUrl);
        const contentHash = await this.generateHash(content);
        
        const normalizedFinal = this.normalizeUrl(finalUrl);
        const isDuplicateUrl = urlCounts.get(normalizedFinal)! > 1;
        const isDuplicateContent = seenHashes.has(contentHash);
        
        if (!isDuplicateContent && contentHash) {
          seenHashes.add(contentHash);
        }

        results.push({
          original_url: url,
          final_url: finalUrl,
          status_code: statusCode,
          content_hash: contentHash,
          is_duplicate_url: isDuplicateUrl,
          is_duplicate_content: isDuplicateContent
        });

        console.log(`🔗 ${url} → Final: ${finalUrl} → Status: ${statusCode} → Hash: ${contentHash} → DupeURL: ${isDuplicateUrl} → DupeContent: ${isDuplicateContent}`);
      } catch (error) {
        console.error('Error processing URL:', url, error);
        results.push({
          original_url: url,
          final_url: url,
          status_code: 500,
          content_hash: '',
          is_duplicate_url: false,
          is_duplicate_content: false
        });
      }
    }

    return results;
  }

  // Process different media types from Excel data
  private static async processMediaType(data: any[], mediaType: string, columnName: string): Promise<MediaItem[]> {
    const urls = data
      .map(row => row[columnName])
      .filter(url => url && typeof url === 'string' && url.trim() !== '');

    if (urls.length === 0) return [];

    const validationResults = await this.validateUrls(urls);
    
    return validationResults.map(result => ({
      original_url: result.original_url,
      final_url: result.final_url,
      media_type: mediaType,
      content_hash: result.content_hash,
      is_valid: result.status_code >= 200 && result.status_code < 400,
      is_duplicate: result.is_duplicate_url || result.is_duplicate_content,
      validation_error: result.status_code >= 400 ? `HTTP ${result.status_code}` : undefined,
      metadata: {
        status_code: result.status_code,
        is_duplicate_url: result.is_duplicate_url,
        is_duplicate_content: result.is_duplicate_content
      }
    }));
  }

  // Main ETL processing function
  public static async processMediaMassaReport(reportId: string, excelData: any[]): Promise<{
    success: boolean;
    processedItems: MediaItem[];
    summary: {
      total_items: number;
      valid_items: number;
      duplicate_items: number;
      by_media_type: Record<string, number>;
    };
    error?: string;
  }> {
    try {
      console.log('Starting ETL processing for report:', reportId);
      
      const allProcessedItems: MediaItem[] = [];

      // Define media type mappings based on your Excel columns
      const mediaTypeConfigs = [
        { type: 'social_media', column: 'Link Media Sosial' },
        { type: 'online_news', column: 'Link Media Online' },
        { type: 'radio', column: 'Monitoring Radio' },
        { type: 'print_media', column: 'Monitoring Media cetak' },
        { type: 'running_text', column: 'Monitoring Running Text' },
        { type: 'tv', column: 'Monitoring Siaran TV' }
      ];

      // Process each media type
      for (const config of mediaTypeConfigs) {
        console.log(`Processing ${config.type}...`);
        const items = await this.processMediaType(excelData, config.type, config.column);
        allProcessedItems.push(...items);
      }

      // Save processed items to database
      if (allProcessedItems.length > 0) {
        const { error } = await supabase
          .from('processed_media_items')
          .insert(allProcessedItems.map(item => ({
            report_id: reportId,
            original_url: item.original_url,
            final_url: item.final_url,
            media_type: item.media_type,
            content_hash: item.content_hash,
            is_valid: item.is_valid,
            is_duplicate: item.is_duplicate,
            validation_error: item.validation_error,
            metadata: item.metadata
          })));

        if (error) {
          console.error('Error saving processed items:', error);
          throw error;
        }
      }

      // Calculate summary statistics
      const summary = {
        total_items: allProcessedItems.length,
        valid_items: allProcessedItems.filter(item => item.is_valid && !item.is_duplicate).length,
        duplicate_items: allProcessedItems.filter(item => item.is_duplicate).length,
        by_media_type: {} as Record<string, number>
      };

      // Count by media type (valid, non-duplicate items only)
      for (const item of allProcessedItems) {
        if (item.is_valid && !item.is_duplicate) {
          summary.by_media_type[item.media_type] = (summary.by_media_type[item.media_type] || 0) + 1;
        }
      }

      // Update report with validation results
      await supabase
        .from('reports')
        .update({
          validation_results: {
            processed_at: new Date().toISOString(),
            summary
          },
          duplicate_count: summary.duplicate_items,
          valid_links_count: summary.valid_items,
          total_links_count: summary.total_items,
          media_breakdown: summary.by_media_type,
          status: 'pending_approval' // Move to approval stage
        })
        .eq('id', reportId);

      // Calculate scoring
      await this.calculateScoring(reportId);

      console.log('ETL processing completed successfully');
      
      return {
        success: true,
        processedItems: allProcessedItems,
        summary
      };

    } catch (error) {
      console.error('ETL processing failed:', error);
      
      // Update report status to failed
      await supabase
        .from('reports')
        .update({
          status: 'system_rejected',
          rejection_reason: `ETL processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
        .eq('id', reportId);

      return {
        success: false,
        processedItems: [],
        summary: {
          total_items: 0,
          valid_items: 0,
          duplicate_items: 0,
          by_media_type: {}
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Calculate scoring using the database function
  private static async calculateScoring(reportId: string): Promise<void> {
    try {
      const { data, error } = await supabase.rpc('calculate_media_massa_scoring', {
        report_id_param: reportId
      });

      if (error) throw error;

      // Update report with calculated score
      const totalScore = data?.total_score || 0;
      await supabase
        .from('reports')
        .update({
          calculated_score: totalScore,
          processed_data: data
        })
        .eq('id', reportId);

    } catch (error) {
      console.error('Error calculating scoring:', error);
      throw error;
    }
  }
}

export default ETLProcessor;