import {
  DocumentExtractionResult,
  SemanticCluster,
  VersionRelationship,
} from '../types';

// Standard English stop words
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from',
  'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself',
  'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most',
  'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our',
  'ours', 'ourselves', 'out', 'over', 'own', 's', 'same', 'she', 'should', 'so', 'some', 'such',
  't', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these',
  'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we',
  'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'will', 'with', 'won',
  'would', 'you', 'your', 'yours', 'yourself', 'yourselves',
  // Generic document words that don't differentiate topics
  'page', 'pages', 'slide', 'slides', 'sheet', 'sheets', 'table', 'tables', 'column', 'columns',
  'row', 'rows', 'data', 'file', 'files', 'document', 'documents', 'text', 'section', 'sections',
  'sample', 'samples', 'item', 'items', 'total', 'totals', 'record', 'records', 'status', 'value', 'values',
]);

/**
 * Tokenizes text into meaningful content terms
 */
export function tokenizeContent(text: string): string[] {
  if (!text) return [];

  // Match words of 3+ letters
  const matches = text.toLowerCase().match(/\b[a-z]{3,}\b/g);
  if (!matches) return [];

  return matches.filter((term) => !STOP_WORDS.has(term));
}

/**
 * Computes Term Frequency (TF) map for a document
 */
function computeTermFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  if (tokens.length === 0) return tf;

  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }

  // Sublinear TF scaling: 1 + log(count)
  for (const [term, count] of tf.entries()) {
    tf.set(term, 1 + Math.log(count));
  }

  return tf;
}

/**
 * Computes Inverse Document Frequency (IDF) map across all corpus documents
 */
function computeInverseDocumentFrequency(
  documentTokenLists: string[][]
): Map<string, number> {
  const idf = new Map<string, number>();
  const totalDocs = documentTokenLists.length;
  if (totalDocs === 0) return idf;

  const docFreq = new Map<string, number>();

  for (const tokens of documentTokenLists) {
    const uniqueTermsInDoc = new Set(tokens);
    for (const term of uniqueTermsInDoc) {
      docFreq.set(term, (docFreq.get(term) || 0) + 1);
    }
  }

  for (const [term, count] of docFreq.entries()) {
    // Smoothed standard IDF
    idf.set(term, 1.0 + Math.log((totalDocs + 1) / (count + 1)));
  }

  return idf;
}

/**
 * Generates an L2-normalized TF-IDF vector for a document
 */
export function computeTfIdfVector(
  tokens: string[],
  idfMap: Map<string, number>
): Map<string, number> {
  const tfMap = computeTermFrequency(tokens);
  const vector = new Map<string, number>();

  let sumSquares = 0;
  for (const [term, tfVal] of tfMap.entries()) {
    const idfVal = idfMap.get(term) || 1.0;
    const weight = tfVal * idfVal;
    vector.set(term, weight);
    sumSquares += weight * weight;
  }

  // L2 Normalize
  const norm = Math.sqrt(sumSquares);
  if (norm > 0) {
    for (const [term, weight] of vector.entries()) {
      vector.set(term, weight / norm);
    }
  }

  return vector;
}

/**
 * Computes Cosine Similarity between two normalized TF-IDF vectors (0.0 to 1.0)
 */
export function computeCosineSimilarity(
  vecA: Map<string, number>,
  vecB: Map<string, number>
): number {
  if (vecA.size === 0 || vecB.size === 0) return 0;

  const [smaller, larger] = vecA.size <= vecB.size ? [vecA, vecB] : [vecB, vecA];
  let dotProduct = 0;

  for (const [term, valA] of smaller.entries()) {
    const valB = larger.get(term);
    if (valB !== undefined) {
      dotProduct += valA * valB;
    }
  }

  return Math.min(1.0, Math.max(0.0, dotProduct));
}

/**
 * Computes hybrid semantic similarity between two documents:
 * Combines cosine term distribution with concept keyword overlap
 */
export function computeSemanticSimilarity(
  tokensA: string[],
  tokensB: string[],
  vecA: Map<string, number>,
  vecB: Map<string, number>
): { score: number; sharedTerms: string[] } {
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  const sharedTerms: string[] = [];
  for (const t of setA) {
    if (setB.has(t)) {
      sharedTerms.push(t);
    }
  }

  if (sharedTerms.length === 0) {
    return { score: 0, sharedTerms: [] };
  }

  const cosine = computeCosineSimilarity(vecA, vecB);
  const minSize = Math.min(setA.size, setB.size);
  const overlap = minSize > 0 ? sharedTerms.length / minSize : 0;

  const score = Math.min(1.0, Math.max(0.0, 0.5 * cosine + 0.5 * overlap));
  return { score, sharedTerms };
}

/**
 * Extracts top distinctive shared keywords between documents
 */
export function extractSharedContentEvidence(
  vecA: Map<string, number>,
  vecB: Map<string, number>,
  limit = 5
): string[] {
  const shared: Array<{ term: string; jointScore: number }> = [];

  for (const [term, weightA] of vecA.entries()) {
    const weightB = vecB.get(term);
    if (weightB !== undefined) {
      shared.push({ term, jointScore: weightA * weightB });
    }
  }

  shared.sort((a, b) => b.jointScore - a.jointScore);
  return shared.slice(0, limit).map((s) => s.term);
}

/**
 * Generates an understandable folder name from top cluster terms and headings
 */
function deriveSuggestedFolderName(
  topTerms: string[],
  clusterHeadings: string[]
): string {
  if (clusterHeadings.length > 0) {
    const prominentHeading = clusterHeadings[0];
    const words = prominentHeading.split(/\s+/).slice(0, 3);
    if (words.length >= 1 && words.join(' ').length <= 25) {
      return `Projects/${words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')}`;
    }
  }

  if (topTerms.length >= 2) {
    const term1 = topTerms[0].charAt(0).toUpperCase() + topTerms[0].slice(1);
    const term2 = topTerms[1].charAt(0).toUpperCase() + topTerms[1].slice(1);
    return `Projects/${term1} ${term2}`;
  }

  if (topTerms.length === 1) {
    const term = topTerms[0].charAt(0).toUpperCase() + topTerms[0].slice(1);
    return `Projects/${term}`;
  }

  return 'Projects/General';
}

/**
 * Performs Semantic Content Analysis:
 * 1. Computes TF-IDF vector space for all documents with extractable text
 * 2. Identifies semantic clusters of related files based on content
 * 3. Identifies version families / near-duplicates
 * 4. Produces human-readable explanations and content evidence
 */
export function analyzeDocumentSemantics(
  extractions: DocumentExtractionResult[]
): {
  clusters: SemanticCluster[];
  versionRelationships: VersionRelationship[];
  similarityMatrix: Map<string, Map<string, number>>;
} {
  const validDocs = extractions.filter((d) => d.isSufficientForAnalysis && d.extractedText);
  const similarityMatrix = new Map<string, Map<string, number>>();
  const versionRelationships: VersionRelationship[] = [];

  if (validDocs.length < 2) {
    return { clusters: [], versionRelationships: [], similarityMatrix };
  }

  const docTokensMap = new Map<string, string[]>();
  const tokenLists: string[][] = [];

  for (const doc of validDocs) {
    const tokens = tokenizeContent(doc.extractedText);
    docTokensMap.set(doc.fileId, tokens);
    tokenLists.push(tokens);
  }

  const idfMap = computeInverseDocumentFrequency(tokenLists);

  const docVectorMap = new Map<string, Map<string, number>>();
  for (const doc of validDocs) {
    const tokens = docTokensMap.get(doc.fileId) || [];
    const vector = computeTfIdfVector(tokens, idfMap);
    docVectorMap.set(doc.fileId, vector);
  }

  // Compute pairwise similarities
  for (let i = 0; i < validDocs.length; i++) {
    const docA = validDocs[i];
    const vecA = docVectorMap.get(docA.fileId)!;
    const tokensA = docTokensMap.get(docA.fileId)!;

    if (!similarityMatrix.has(docA.fileId)) {
      similarityMatrix.set(docA.fileId, new Map<string, number>());
    }

    for (let j = i + 1; j < validDocs.length; j++) {
      const docB = validDocs[j];
      const vecB = docVectorMap.get(docB.fileId)!;
      const tokensB = docTokensMap.get(docB.fileId)!;

      if (!similarityMatrix.has(docB.fileId)) {
        similarityMatrix.set(docB.fileId, new Map<string, number>());
      }

      const { score: sim, sharedTerms } = computeSemanticSimilarity(tokensA, tokensB, vecA, vecB);
      similarityMatrix.get(docA.fileId)!.set(docB.fileId, sim);
      similarityMatrix.get(docB.fileId)!.set(docA.fileId, sim);

      // Section 6: Conservative Version & Near-Duplicate Detection (sim >= 0.80)
      if (sim >= 0.80) {
        const isNearDuplicate = sim >= 0.85;
        versionRelationships.push({
          sourceFileId: docA.fileId,
          sourceFileName: docA.originalName,
          targetFileId: docB.fileId,
          targetFileName: docB.originalName,
          similarityScore: Number(sim.toFixed(3)),
          relationshipType: isNearDuplicate ? 'near_duplicate' : 'revision',
          explanation: isNearDuplicate
            ? `Extremely high text similarity (${Math.round(sim * 100)}%). Likely an identical or edited copy with minor changes.`
            : `High text similarity (${Math.round(sim * 100)}%). Appears to be a draft, revision, or related edition of the same document.`,
          contentEvidence: sharedTerms.slice(0, 5),
        });
      }
    }
  }

  // Semantic Clustering Algorithm (Threshold: >= 0.15 with >= 2 shared terms)
  const CLUSTER_SIMILARITY_THRESHOLD = 0.15;
  const visited = new Set<string>();
  const clusters: SemanticCluster[] = [];

  for (let i = 0; i < validDocs.length; i++) {
    const seedDoc = validDocs[i];
    if (visited.has(seedDoc.fileId)) continue;

    const clusterFileIds: string[] = [seedDoc.fileId];
    const clusterFileNames: string[] = [seedDoc.originalName];
    const clusterHeadings: string[] = [];

    if (seedDoc.metadata.detectedTitle) {
      clusterHeadings.push(seedDoc.metadata.detectedTitle);
    }

    let pairwiseSimSum = 0;
    let pairwiseCount = 0;

    for (let j = 0; j < validDocs.length; j++) {
      if (i === j) continue;
      const otherDoc = validDocs[j];
      if (visited.has(otherDoc.fileId)) continue;

      const sim = similarityMatrix.get(seedDoc.fileId)?.get(otherDoc.fileId) || 0;
      if (sim >= CLUSTER_SIMILARITY_THRESHOLD) {
        clusterFileIds.push(otherDoc.fileId);
        clusterFileNames.push(otherDoc.originalName);
        if (otherDoc.metadata.detectedTitle) {
          clusterHeadings.push(otherDoc.metadata.detectedTitle);
        }
        pairwiseSimSum += sim;
        pairwiseCount += 1;
      }
    }

    // Only cluster if at least 2 distinct files share strong semantic content
    if (clusterFileIds.length >= 2) {
      for (const id of clusterFileIds) {
        visited.add(id);
      }

      const avgSim = pairwiseCount > 0 ? pairwiseSimSum / pairwiseCount : CLUSTER_SIMILARITY_THRESHOLD;

      // Extract joint salient keywords
      const jointTermWeights = new Map<string, number>();
      for (const fileId of clusterFileIds) {
        const tokens = docTokensMap.get(fileId) || [];
        for (const t of tokens) {
          jointTermWeights.set(t, (jointTermWeights.get(t) || 0) + 1);
        }
      }

      const sortedTerms = Array.from(jointTermWeights.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([t]) => t);

      const suggestedFolder = deriveSuggestedFolderName(sortedTerms, clusterHeadings);
      const confidence =
        avgSim >= 0.35 || (clusterFileIds.length >= 3 && avgSim >= 0.22)
          ? 'strong'
          : avgSim >= 0.18
          ? 'moderate'
          : 'needs_review';

      clusters.push({
        clusterId: `cluster-${clusters.length + 1}`,
        suggestedFolderName: suggestedFolder,
        topicSummary: `Related documents discussing ${sortedTerms.slice(0, 3).join(', ')}`,
        contentEvidence: sortedTerms,
        averageSimilarity: Number(avgSim.toFixed(3)),
        confidence,
        fileIds: clusterFileIds,
        fileNames: clusterFileNames,
      });
    }
  }

  return { clusters, versionRelationships, similarityMatrix };
}
