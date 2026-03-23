const tagSeeds = ['Creative - 24'];

function toSlug(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const tagDefinitions = tagSeeds.map((tag) => {
  const [labelRaw, countRaw] = tag.split(' - ');
  const label = (labelRaw ?? tag).trim();
  const count = countRaw ? parseInt(countRaw, 10) : undefined;

  return {
    label,
    slug: toSlug(label),
  };
});

console.log(tagDefinitions);
console.log(tagDefinitions.find((t) => t.slug === 'creative'));
