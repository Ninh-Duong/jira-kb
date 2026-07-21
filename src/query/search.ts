import type { NormalizedTicket } from '../models/ticket';

export interface SearchHit<T> {
  item: T;
  score: number;
  matchedTerms: string[];
}

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9@#.-]+/g)
    .map((term) => term.trim())
    .filter(Boolean);
}

function scoreText(text: string, term: string, exactWeight = 10, partialWeight = 3): number {
  const normalized = text.toLowerCase();
  if (normalized === term) {
    return exactWeight;
  }

  if (normalized.includes(term)) {
    return partialWeight;
  }

  return 0;
}

function scoreTicket(ticket: NormalizedTicket, terms: string[]): SearchHit<NormalizedTicket> {
  const haystack = [
    ticket.key,
    ticket.summary,
    ticket.status,
    ticket.issueType,
    ticket.epicKey ?? '',
    ticket.labels.join(' '),
    ticket.components.join(' '),
    ticket.sprintNames.join(' '),
    ticket.searchText
  ];

  let score = 0;
  const matchedTerms = new Set<string>();

  for (const term of terms) {
    let termScore = 0;

    termScore += scoreText(ticket.key, term, 80, 40);
    termScore += scoreText(ticket.summary, term, 25, 10);
    termScore += scoreText(ticket.status, term, 15, 7);
    termScore += scoreText(ticket.issueType, term, 15, 7);
    termScore += scoreText(ticket.epicKey ?? '', term, 20, 8);
    termScore += scoreText(ticket.labels.join(' '), term, 12, 6);
    termScore += scoreText(ticket.components.join(' '), term, 12, 6);
    termScore += scoreText(ticket.sprintNames.join(' '), term, 12, 6);

    if (ticket.searchText.includes(term)) {
      termScore += 2;
    }

    if (termScore > 0) {
      matchedTerms.add(term);
    }

    score += termScore;
  }

  for (const field of haystack) {
    if (field.toLowerCase().includes(terms.join(' '))) {
      score += 1;
      break;
    }
  }

  return {
    item: ticket,
    score,
    matchedTerms: [...matchedTerms]
  };
}

export function searchTickets(
  tickets: NormalizedTicket[],
  query: string,
  limit = 20
): Array<SearchHit<NormalizedTicket>> {
  const terms = tokenize(query);
  if (terms.length === 0) {
    return tickets.slice(0, limit).map((item) => ({
      item,
      score: 0,
      matchedTerms: []
    }));
  }

  return tickets
    .map((ticket) => scoreTicket(ticket, terms))
    .filter((hit) => hit.score > 0)
    .sort((left, right) => right.score - left.score || left.item.key.localeCompare(right.item.key))
    .slice(0, limit);
}
