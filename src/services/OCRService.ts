import { Camera } from 'expo-camera';
import * as FileSystem from 'expo-file-system';

interface OCRResult {
  success: boolean;
  text?: string;
  expiryDate?: string;
  error?: string;
}

class OCRService {
  private expiryDatePatterns = [
    // MM/DD/YYYY, MM/DD/YY
    /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g,
    // DD/MM/YYYY, DD/MM/YY
    /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g,
    // YYYY-MM-DD
    /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g,
    // DD-MM-YYYY
    /\b(\d{1,2})-(\d{1,2})-(\d{4})\b/g,
    // Month DD, YYYY
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})\b/gi,
    // DD Month YYYY
    /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})\b/gi,
    // EXP: MM/YY, Exp MM/YY
    /(?:exp|expiry|expires?|best\s+before)[:\s]*(\d{1,2})\/(\d{2,4})/gi,
    // Use by: DD/MM/YY
    /(?:use\s+by|best\s+by)[:\s]*(\d{1,2})\/(\d{1,2})\/(\d{2,4})/gi,
  ];

  private monthNames = {
    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
    'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
    'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
  };

  async extractTextFromImage(imageUri: string): Promise<OCRResult> {
    try {
      // For now, we'll simulate OCR since react-native-text-recognition might need additional setup
      // In a real implementation, you would use ML Kit Text Recognition
      
      // Simulate text extraction with common expiry date formats
      const simulatedText = this.generateSampleExpiryText();
      
      console.log('Simulated OCR text:', simulatedText);
      
      const expiryDate = this.extractExpiryDate(simulatedText);
      
      return {
        success: true,
        text: simulatedText,
        expiryDate: expiryDate || undefined,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to extract text from image',
      };
    }
  }

  private generateSampleExpiryText(): string {
    // Generate a random expiry date for demo purposes
    const today = new Date();
    const futureDate = new Date(today.getTime() + (Math.random() * 365 * 24 * 60 * 60 * 1000));
    
    const formats = [
      `EXP: ${(futureDate.getMonth() + 1).toString().padStart(2, '0')}/${futureDate.getFullYear().toString().slice(-2)}`,
      `Best Before: ${futureDate.getDate().toString().padStart(2, '0')}/${(futureDate.getMonth() + 1).toString().padStart(2, '0')}/${futureDate.getFullYear()}`,
      `Use by ${futureDate.getDate()} ${Object.keys(this.monthNames)[futureDate.getMonth()]} ${futureDate.getFullYear()}`,
      `Expires: ${(futureDate.getMonth() + 1).toString().padStart(2, '0')}/${futureDate.getDate().toString().padStart(2, '0')}/${futureDate.getFullYear()}`,
    ];
    
    return formats[Math.floor(Math.random() * formats.length)];
  }

  extractExpiryDate(text: string): string | null {
    if (!text) return null;

    console.log('Extracting expiry date from:', text);

    for (const pattern of this.expiryDatePatterns) {
      const matches = Array.from(text.matchAll(pattern));
      
      for (const match of matches) {
        const dateString = this.parseMatchToDate(match);
        if (dateString) {
          console.log('Found expiry date:', dateString);
          return dateString;
        }
      }
    }

    return null;
  }

  private parseMatchToDate(match: RegExpMatchArray): string | null {
    try {
      const fullMatch = match[0].toLowerCase();
      
      // Handle different date formats
      if (fullMatch.includes('exp') || fullMatch.includes('expiry') || fullMatch.includes('expires')) {
        // Handle expiry formats like "EXP: MM/YY"
        const parts = fullMatch.match(/(\d{1,2})\/(\d{2,4})/);
        if (parts) {
          const month = parts[1].padStart(2, '0');
          let year = parts[2];
          if (year.length === 2) {
            year = parseInt(year) < 50 ? `20${year}` : `19${year}`;
          }
          // Assume last day of the month for expiry
          const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
          return `${year}-${month}-${lastDay.toString().padStart(2, '0')}`;
        }
      }

      // Handle month names
      if (fullMatch.includes('jan') || fullMatch.includes('feb') || fullMatch.includes('mar') || 
          fullMatch.includes('apr') || fullMatch.includes('may') || fullMatch.includes('jun') ||
          fullMatch.includes('jul') || fullMatch.includes('aug') || fullMatch.includes('sep') ||
          fullMatch.includes('oct') || fullMatch.includes('nov') || fullMatch.includes('dec')) {
        
        const monthMatch = fullMatch.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i);
        const dayMatch = fullMatch.match(/(\d{1,2})/);
        const yearMatch = fullMatch.match(/(\d{4})/);
        
        if (monthMatch && dayMatch && yearMatch) {
          const month = this.monthNames[monthMatch[1].toLowerCase() as keyof typeof this.monthNames];
          const day = dayMatch[1].padStart(2, '0');
          const year = yearMatch[1];
          return `${year}-${month}-${day}`;
        }
      }

      // Handle numeric formats
      const numericMatch = fullMatch.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
      if (numericMatch) {
        let [, first, second, year] = numericMatch;
        
        // Convert 2-digit year to 4-digit
        if (year.length === 2) {
          year = parseInt(year) < 50 ? `20${year}` : `19${year}`;
        }

        // Assume MM/DD/YYYY format for US dates, DD/MM/YYYY for others
        // We'll use a heuristic: if first number > 12, it's probably DD/MM
        let month, day;
        if (parseInt(first) > 12) {
          day = first.padStart(2, '0');
          month = second.padStart(2, '0');
        } else if (parseInt(second) > 12) {
          month = first.padStart(2, '0');
          day = second.padStart(2, '0');
        } else {
          // Ambiguous case, assume MM/DD
          month = first.padStart(2, '0');
          day = second.padStart(2, '0');
        }

        return `${year}-${month}-${day}`;
      }

      return null;
    } catch (error) {
      console.error('Error parsing date match:', error);
      return null;
    }
  }

  async scanExpiryDateFromCamera(): Promise<OCRResult> {
    try {
      // Request camera permissions
      const { status } = await Camera.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        return {
          success: false,
          error: 'Camera permission not granted',
        };
      }

      // For demo purposes, return a simulated result
      // In a real implementation, you would:
      // 1. Take a photo with the camera
      // 2. Send it to ML Kit Text Recognition
      // 3. Extract text and parse for expiry dates
      
      return this.extractTextFromImage('demo');
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to scan expiry date',
      };
    }
  }

  // Test method to validate expiry date parsing
  testExpiryDateParsing(): void {
    const testStrings = [
      'EXP: 12/25',
      'Best Before: 15/03/2025',
      'Use by 25 Dec 2024',
      'Expires: 03/15/2025',
      'BB: 2025-12-25',
      'Expiry Date: Jan 15, 2025',
    ];

    console.log('Testing expiry date parsing:');
    testStrings.forEach(text => {
      const result = this.extractExpiryDate(text);
      console.log(`"${text}" -> ${result}`);
    });
  }
}

export default new OCRService();
