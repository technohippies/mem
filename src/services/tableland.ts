console.log('[TablelandClient] Checking purchase status:', {
  userAddress,
  deckId,
  contractAddress
});

console.log('[TablelandClient] hasPurchased check:', {
  userAddress,
  deckId,
  result,
  resultType: typeof result
});

// Consolidate decryption logs
console.log('[TablelandClient] Starting decryption...', {
  deckId,
  hasEncryptionKey: !!deck.encryption_key,
  hasAccessConditions: !!deck.access_conditions,
  contentLength: deck.content?.length
});

// Single success log
console.log('[TablelandClient] Successfully decrypted content');

// Summary of mapped cards
console.log('[TablelandClient] Mapped cards:', {
  total: cards.length,
  firstCard: cards[0],
  lastCard: cards[cards.length - 1]
}); 