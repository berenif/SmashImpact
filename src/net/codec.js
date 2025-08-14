const LZString = (() => {
	const keyStrBase64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
	const getBaseValue = (alphabet, character) => alphabet.indexOf(character);
	const _compress = function (uncompressed, bitsPerChar, getCharFromInt) {
		if (uncompressed == null) return "";
		let i, value = 0,
			context_dictionary = {},
			context_dictionaryToCreate = {},
			context_c = "",
			context_wc = "",
			context_w = "",
			context_enlargeIn = 2,
			context_dictSize = 3,
			context_numBits = 2,
			context_data = [],
			context_data_val = 0,
			context_data_position = 0;
		for (i = 0; i < uncompressed.length; i += 1) {
			context_c = uncompressed.charAt(i);
			if (!Object.prototype.hasOwnProperty.call(context_dictionary, context_c)) {
				context_dictionary[context_c] = context_dictSize++;
				context_dictionaryToCreate[context_c] = true;
			}
			context_wc = context_w + context_c;
			if (Object.prototype.hasOwnProperty.call(context_dictionary, context_wc)) {
				context_w = context_wc;
			} else {
				if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
					let value = context_w.charCodeAt(0);
					for (let j = 0; j < context_numBits; j++) {
						context_data_val = (context_data_val << 1);
						if (context_data_position == bitsPerChar - 1) {
							context_data_position = 0;
							context_data.push(getCharFromInt(context_data_val));
							context_data_val = 0;
						} else context_data_position++;
					}
					for (let j = 0; j < 16; j++) {
						context_data_val = (context_data_val << 1) | ((value >> j) & 1);
						if (context_data_position == bitsPerChar - 1) {
							context_data_position = 0;
							context_data.push(getCharFromInt(context_data_val));
							context_data_val = 0;
						} else context_data_position++;
					}
				} else {
					value = context_dictionary[context_w];
					for (let j = 0; j < context_numBits; j++) {
						context_data_val = (context_data_val << 1) | (value & 1);
						if (context_data_position == bitsPerChar - 1) {
							context_data_position = 0;
							context_data.push(getCharFromInt(context_data_val));
							context_data_val = 0;
						} else context_data_position++;
						value >>= 1;
					}
				}
				context_enlargeIn--;
				if (context_enlargeIn == 0) { context_enlargeIn = 1 << context_numBits; context_numBits++; }
				context_dictionary[context_wc] = context_dictSize++;
				context_w = String(context_c);
			}
		}
		if (context_w !== '') {
			if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
				let value = context_w.charCodeAt(0);
				for (let j = 0; j < context_numBits; j++) {
					context_data_val = (context_data_val << 1);
					if (context_data_position == bitsPerChar - 1) {
						context_data_position = 0;
						context_data.push(getCharFromInt(context_data_val));
						context_data_val = 0;
					} else context_data_position++;
				}
				for (let j = 0; j < 16; j++) {
					context_data_val = (context_data_val << 1) | ((value >> j) & 1);
					if (context_data_position == bitsPerChar - 1) {
						context_data_position = 0;
						context_data.push(getCharFromInt(context_data_val));
						context_data_val = 0;
					} else context_data_position++;
				}
			} else {
				value = context_dictionary[context_w];
				for (let j = 0; j < context_numBits; j++) {
					context_data_val = (context_data_val << 1) | (value & 1);
					if (context_data_position == bitsPerChar - 1) {
						context_data_position = 0;
						context_data.push(getCharFromInt(context_data_val));
						context_data_val = 0;
					} else context_data_position++;
					value >>= 1;
				}
			}
			context_enlargeIn--;
			if (context_enlargeIn == 0) { context_enlargeIn = 1 << context_numBits; context_numBits++; }
		}
		value = 2;
		for (let j = 0; j < context_numBits; j++) {
			context_data_val = (context_data_val << 1) | (value & 1);
			if (context_data_position == bitsPerChar - 1) {
				context_data_position = 0;
				context_data.push(getCharFromInt(context_data_val));
				context_data_val = 0;
			} else context_data_position++;
		}
		while (true) {
			context_data_val = (context_data_val << 1);
			if (context_data_position == bitsPerChar - 1) {
				context_data.push(getCharFromInt(context_data_val));
				break;
			} else context_data_position++;
		}
		return context_data.join('');
	};
	const _decompress = function (length, resetValue, getNextValue) {
		const dictionary = [], result = [], data = { val: getNextValue(0), position: resetValue, index: 1 };
		let enlargeIn = 4, dictSize = 4, numBits = 3, entry, w, bits, resb, maxpower, power, c;
		function nextBits(n) {
			bits = 0; maxpower = Math.pow(2, n); power = 1;
			while (power != maxpower) { resb = data.val & data.position; data.position >>= 1; if (data.position == 0) { data.position = resetValue; data.val = getNextValue(data.index++); } bits |= (resb > 0 ? 1 : 0) * power; power <<= 1; }
			return bits;
		}
		for (let i = 0; i < 3; i++) dictionary[i] = i;
		bits = nextBits(2);
		switch (bits) { case 0: c = String.fromCharCode(nextBits(16)); dictionary[3] = c; w = c; result.push(c); break; case 1: c = String.fromCharCode(nextBits(8)); dictionary[3] = c; w = c; result.push(c); break; case 2: return ""; }
		while (true) {
			if (data.index > length) return "";
			bits = nextBits(numBits);
			let cc;
			switch (cc = bits) {
				case 0: c = String.fromCharCode(nextBits(16)); dictionary[dictSize++] = c; enlargeIn--; if (enlargeIn == 0) { enlargeIn = Math.pow(2, numBits); numBits++; } break;
				case 1: c = String.fromCharCode(nextBits(8)); dictionary[dictSize++] = c; enlargeIn--; if (enlargeIn == 0) { enlargeIn = Math.pow(2, numBits); numBits++; } break;
				case 2: return result.join('');
				default: break;
			}
			if (cc === 0 || cc === 1) { w = c; result.push(c); continue; }
			let entryStr;
			if (bits < dictionary.length) { entryStr = dictionary[bits]; }
			else { if (bits === dictSize) { entryStr = w + w.charAt(0); } else { return ""; } }
			result.push(entryStr);
			dictionary[dictSize++] = w + entryStr.charAt(0);
			w = entryStr;
			enlargeIn--; if (enlargeIn == 0) { enlargeIn = Math.pow(2, numBits); numBits++; }
		}
	};
	return {
		compressToBase64: function (input) {
			if (input == null) return "";
			let res = _compress(input, 6, function (a) { return keyStrBase64.charAt(a); });
			switch (res.length % 4) { default: case 0: return res; case 1: return res + "==="; case 2: return res + "=="; case 3: return res + "="; }
		},
		decompressFromBase64: function (input) {
			if (input == null) return "";
			input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
			return _decompress(input.length, 32, function (index) { return getBaseValue(keyStrBase64, input.charAt(index)); });
		}
	};
})();

export const encodeForShare = (s) => 'z' + LZString.compressToBase64(s);
export const decodeShared = (s) => (s && s[0] === 'z') ? (LZString.decompressFromBase64(s.slice(1)) || '') : s;