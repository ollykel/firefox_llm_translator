// Miscellaneous utils.

const formatJSON = (obj) =>
{
    const formattedEntries = Object.entries(obj).map(([k, v]) => `"${k}": "${v}"`);

    return `{${formattedEntries.join(", ")}}`;
};// end formatJSON

module.exports = { formatJSON };
