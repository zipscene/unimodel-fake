const { getPath } = require('zs-objtools');

/**
 * This function sorts an array by multiple fields.
 *
 * @method multiFieldSort
 * @param {Object[]} array - Array of objects to sort
 * @param {String[]} sortBy - Array of field names (optionally prefixed with '-')
 * @return {Object[]} - The input array.  It is also sorted in-place.
 */
function multiFieldSort(array, sortBy) {
	array.sort((a, b) => {
		for (let field of sortBy) {
			let reverse = field[0] === '-';
			if (reverse) {
				field = field.slice(1);
			}
			let valueA = getPath(a, field);
			let valueB = getPath(b, field);
			if (reverse) {
				if (valueA > valueB) return -1;
				else if (valueA < valueB) return 1;
			} else {
				if (valueA > valueB) return 1;
				else if (valueA < valueB) return -1;
			}
		}
		return 0;
	});
	return array;
}

module.exports = {
	multiFieldSort
};
