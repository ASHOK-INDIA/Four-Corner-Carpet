import fs from 'fs';
import path from 'path';

const serverPath = path.join(process.cwd(), 'server.ts');
let content = fs.readFileSync(serverPath, 'utf8');

// Ensure import exists at top
if (!content.includes("from './src/data/buyerLeadsDatabase.ts'")) {
  content = "import { verifiedGlobalBuyers } from './src/data/buyerLeadsDatabase.ts';\n" + content;
}

// Locate start of inline verifiedGlobalBuyers array:
// "// Verified Global International Rug Buyers Database (Strictly Non-India)"
// or "const verifiedGlobalBuyers = ["
const startMarker = "// Verified Global International Rug Buyers Database (Strictly Non-India)";
const endMarker = "// API Route: Real B2B Lead Generate API with Live Google Search Grounding & Buyer Intelligence";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + content.substring(endIndex);
  console.log('Removed duplicate inline verifiedGlobalBuyers array from server.ts');
}

// Now replace the /api/leads/generate route implementation with enhanced version that supports:
// 1,000 leads, Instagram Chhote buyers, and World Local Directories
const routeMarker = "// API Route: Real B2B Lead Generate API with Live Google Search Grounding & Buyer Intelligence";
const nextRouteMarker = "// API Documentation Endpoint for developers & external integrations";

const routeStartIndex = content.indexOf(routeMarker);
const routeEndIndex = content.indexOf(nextRouteMarker);

if (routeStartIndex !== -1 && routeEndIndex !== -1) {
  const newRouteCode = `// API Route: Real B2B Lead Generate API with Live Google Search Grounding & Buyer Intelligence
// Connects 1,000 Verified Leads with World Local Directories (Europages, Kompass, Eniro, Kraks, Yell, ThomasNet) & Instagram Chhote Retailers
app.all(['/api/leads/generate', '/api/leads/search', '/api/fetch-buyers'], async (req, res) => {
  try {
    const body = req.body || {};
    const queryParams = (req.query || {}) as Record<string, any>;
    const query = (body.query || queryParams.query || '').toString().trim();
    const country = (body.country || queryParams.country || 'ALL').toString().trim();
    const category = (body.category || queryParams.category || 'ALL').toString().trim();
    const targetRole = (body.targetRole || queryParams.targetRole || 'Sourcing Director, Carpet Buyer, Head of Procurement').toString();
    const limit = Number(body.limit || queryParams.limit || 1000);
    const provider = (body.provider || queryParams.provider || 'google_search').toString();
    const externalApiKey = (body.externalApiKey || queryParams.externalApiKey || '').toString();
    const onlyInstagram = Boolean(body.onlyInstagram || queryParams.onlyInstagram === 'true');
    const onlySmallRetailers = Boolean(body.onlySmallRetailers || queryParams.onlySmallRetailers === 'true');
    const onlyWorldDirectories = Boolean(body.onlyWorldDirectories || queryParams.onlyWorldDirectories === 'true');

    const selectedCountry = country || 'ALL';
    const selectedCategory = category || 'ALL';
    // Support up to 1,000 leads in a single request
    const numLimit = Math.min(Math.max(Number(limit) || 1000, 1), 1000);
    const leadApiKey = externalApiKey || getApiKey();

    // Helper to sanitize any AI-generated pitch from AIYARA branding
    const cleanPitch = (text: string) => {
      if (!text) return '';
      return text
        .replace(/aiyara\\s*textile/gi, 'Export House')
        .replace(/aiyara/gi, 'Export House')
        .replace(/support@aiyaratextile\\.in/gi, 'support@exporthouse.com')
        .replace(/sale@aiyaratextile\\.in/gi, 'sales@exporthouse.com');
    };

    // Filter out any Indian entities from verifiedGlobalBuyers (strictly international buyers)
    let filteredList = verifiedGlobalBuyers
      .filter(b => b.country && b.country.toLowerCase() !== 'india' && !b.country.toLowerCase().includes('india'))
      .map(b => ({
        ...b,
        samplePitch: cleanPitch(b.samplePitch)
      }));

    // Filter by Instagram Chhote Buyers
    if (onlyInstagram) {
      filteredList = filteredList.filter(b => b.isInstagramBuyer || b.instagramHandle || b.isSmallRetailer);
    }

    // Filter by Small Retailers (Boutiques / Low MOQ)
    if (onlySmallRetailers) {
      filteredList = filteredList.filter(b => b.isSmallRetailer || b.moqFriendly || (b.scale && (b.scale.toLowerCase().includes('boutique') || b.scale.toLowerCase().includes('gallery'))));
    }

    // Filter by World Local Directories
    if (onlyWorldDirectories) {
      filteredList = filteredList.filter(b => Boolean(b.directorySource || b.directoryListingUrl));
    }

    // Filter by country if specified
    if (selectedCountry && selectedCountry !== 'ALL') {
      const cLower = selectedCountry.toLowerCase();
      filteredList = filteredList.filter(b => b.country.toLowerCase() === cLower || b.country.toLowerCase().includes(cLower));
    }

    // Filter by category if specified
    if (selectedCategory && selectedCategory !== 'ALL' && selectedCategory !== 'Rugs & Carpets (All)') {
      const catLower = selectedCategory.toLowerCase();
      filteredList = filteredList.filter(b => {
        const bCat = b.category.toLowerCase();
        return bCat.includes(catLower) || 
          (catLower.includes('boutique') && (bCat.includes('boutique') || b.isSmallRetailer)) ||
          (catLower.includes('gallery') && bCat.includes('gallery')) ||
          (catLower.includes('custom') && bCat.includes('custom')) ||
          (catLower.includes('hospitality') && bCat.includes('hospitality')) ||
          (catLower.includes('furniture') && bCat.includes('furniture')) ||
          (catLower.includes('kids') && bCat.includes('kids'));
      });
    }

    // Filter by text search query if provided
    if (query) {
      const qLower = query.toLowerCase();
      const qTerms = qLower.split(' ').filter(t => t.length > 2 && !t.includes('site:'));
      const qMatches = filteredList.filter(b => {
        return (
          b.companyName.toLowerCase().includes(qLower) ||
          b.country.toLowerCase().includes(qLower) ||
          (b.city && b.city.toLowerCase().includes(qLower)) ||
          b.category.toLowerCase().includes(qLower) ||
          b.keyPerson.toLowerCase().includes(qLower) ||
          (b.directorySource && b.directorySource.toLowerCase().includes(qLower)) ||
          (b.instagramHandle && b.instagramHandle.toLowerCase().includes(qLower)) ||
          (b.sourcingProducts && b.sourcingProducts.some(p => p.toLowerCase().includes(qLower))) ||
          qTerms.some(term => 
            b.companyName.toLowerCase().includes(term) || 
            b.country.toLowerCase().includes(term) ||
            b.category.toLowerCase().includes(term)
          )
        );
      });
      if (qMatches.length > 0) {
        filteredList = qMatches;
      }
    }

    // Live AI Search with Google Grounding across World Local Directories & Instagram if requested
    if (query && leadApiKey && provider === 'google_search') {
      try {
        const prompt = \`Search World Local Directories (Europages, Kompass, Eniro, Yell, ThomasNet, Kraks, YellowPages) and Instagram boutique rug retailers for query: "\${query}" and category: "\${category}".
        CRITICAL RULES:
        1. EXCLUDE any buyers, offices, or buying agencies located in India. We are looking for international buyers only (USA, Europe, UK, UAE, Scandinavia, Australia).
        2. DIRECT COLD EMAIL PITCH SCRIPT ("samplePitch"): Do NOT use the company name "AIYARA" or "AIYARA TEXTILE". Sign off neutrally as:
           "Warm regards,
Ashok Kumar
Export House (Bhadohi, India)"
        3. Include verified directory sources (Europages, Kompass, Eniro, Yell, etc.) and Instagram handles (@handle) where available.
        Format the output as a valid JSON array of objects, each with:
        {
          "id": "string",
          "companyName": "string",
          "website": "string",
          "country": "string",
          "city": "string",
          "category": "string",
          "scale": "string",
          "isSmallRetailer": boolean,
          "moqFriendly": boolean,
          "contactName": "string",
          "contactDesignation": "string",
          "linkedinUrl": "string",
          "instagramHandle": "string",
          "directorySource": "string",
          "email": "string",
          "phone": "string",
          "leadScore": number,
          "sourcingProducts": ["string"],
          "whyGoodFit": "string",
          "samplePitch": "string"
        }\`;

        const ai = new GoogleGenAI({
          apiKey: leadApiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
        });

        const aiPromise = ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { 
            tools: [{ googleSearch: {} }],
            responseMimeType: 'application/json',
            toolConfig: { includeServerSideToolInvocations: true }
          }
        });

        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('AI generation timed out after 18s')), 18000)
        );

        const response: any = await Promise.race([aiPromise, timeoutPromise]);

        let liveLeads = [];
        try {
          const responseText = response?.text || '[]';
          const jsonMatch = responseText.match(/\\[[\\s\\S]*\\]/);
          liveLeads = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
        } catch (parseErr) {
          console.error('AI JSON parse error:', parseErr);
          liveLeads = [];
        }

        if (Array.isArray(liveLeads) && liveLeads.length > 0) {
          const cleanedLive = liveLeads
            .filter((l: any) => l && l.country && l.country.toLowerCase() !== 'india' && !l.country.toLowerCase().includes('india'))
            .map((l: any) => ({
              ...l,
              samplePitch: cleanPitch(l.samplePitch),
              keyPerson: l.keyPerson || \`\${l.contactName || 'Buyer'} (\${l.contactDesignation || 'Sourcing'})\`,
              isVerifiedLive: true
            }));
          
          const combined = [...cleanedLive, ...filteredList];
          const uniqueMap = new Map();
          for (const item of combined) {
            if (!uniqueMap.has(item.companyName.toLowerCase())) {
              uniqueMap.set(item.companyName.toLowerCase(), item);
            }
          }
          const finalResult = Array.from(uniqueMap.values()).slice(0, numLimit);
          return res.json({ 
            success: true, 
            leads: finalResult, 
            totalCount: finalResult.length,
            availableTotal: verifiedGlobalBuyers.length,
            isLiveWebSearch: true,
            provider: 'Live World Directories (Europages / Kompass / Eniro) & Instagram Sourcing + Verified Directory'
          });
        }
      } catch (aiErr: any) {
        console.warn('AI search grounding error in /api/leads/generate, returning verified global buyers:', aiErr?.message || aiErr);
      }
    }

    // Default fast delivery from verified global buyers database (up to 1,000 leads)
    const resultLeads = (filteredList.length > 0 ? filteredList : verifiedGlobalBuyers).slice(0, numLimit);
    return res.json({ 
      success: true, 
      leads: resultLeads, 
      totalCount: resultLeads.length,
      availableTotal: verifiedGlobalBuyers.length,
      isLiveWebSearch: false,
      provider: 'World Local Directories (Europages, Kompass, Eniro) & Instagram Chhote Retailers (1,000 Leads)'
    });
  } catch (err: any) {
    console.error('Error in /api/leads/generate route:', err);
    return res.status(500).json({ 
      success: false, 
      error: err?.message || 'Failed to generate leads via Lead API',
      hint: 'Verify internet connection or use default search parameters.'
    });
  }
});\n\n`;

  content = content.substring(0, routeStartIndex) + newRouteCode + content.substring(routeEndIndex);
  console.log('Successfully updated /api/leads/generate route in server.ts');
}

fs.writeFileSync(serverPath, content, 'utf8');
console.log('Finished patching server.ts');
