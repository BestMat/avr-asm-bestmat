// Nagapillaiyar Sai Amman
console.log("Nagapillaiyar Sai")

import { writeFileSync } from "node:fs";
const MASK = 0x0F;
class Assembler {
	#ptr = 0;
	constructor(MEMORY = 1024) {
		// MEMORY: bytes
		this.buffer = new ArrayBuffer(MEMORY);
		this.view   = new DataView(this.buffer);
		this.MEMORY = MEMORY;
	}
	#write(byte) {
		assert(this.#ptr + 2 <= this.buffer.byteLength, `Memory Overflow: cannot write 2 bytes (#ptr = ${this.#ptr})`);
		this.view.setUint16(this.#ptr, byte, true);
		this.#ptr += 2;
		return this.#ptr - 2;
	}
	sbi(regX, regY) {
		assert(Number.isInteger(regX) && 0 <= regX && regX <= 31, `regX (0 <= regX <= 31) must be between [0, 31] but got ${regX} instead`);
		assert(Number.isInteger(regY) && 0 <= regY && regY <= 7, `regY (0 <= regY <= 7) must be between [0, 7] but got ${regY} instead`);
		
		const high = 0x9A;
		const low  = (regX << 3) | regY; // AAAA Abbb
		const byte = (high << 8) | low;
		this.#write(byte);
		const str              = `${high.hex()} ${low.hex()}`;
		const strLittleEndian  = `${low.hex()} ${high.hex()}`;

		console.log({ byte, str, strLittleEndian  });
		return { byte, str, strLittleEndian  };
		// const high  = (bytes >> 4) & MASK;
		// const low   = bytes & MASK;
	}
	compileIntel(fileName = "bestmat.hex", bytesPerLine = 16) {
		const bytes = new Uint8Array(this.buffer, 0, this.#ptr);
		const lines = [];
		for (let addr = 0; addr < bytes.length; addr += bytesPerLine) {
			let hex = ":";
			const chunk = bytes.slice(addr, addr + bytesPerLine);
			const cnt = chunk.length;
			const type = 0x00;
			// LL AAAA TT [DD ...] CC
			hex += cnt.intelHex();   // Byte Count
			hex += addr.intelHex(4); // Address
			hex += type.intelHex();  // Record Type (00: Data Record)
			let sum = cnt + ((addr >> 8) & 0xFF) + (addr & 0xFF) + type;
			for (const byte of chunk) {
				hex += byte.intelHex();
				sum += byte;
			}
			const checksum = (-sum) & 0xFF;
			hex += checksum.intelHex();
			lines.push(hex);
		}
		lines.push(":00000001FF"); // (01: EOF Record)
		const dump = lines.join("\n");
		console.log(`[INFO] Compilation Successful.`);
		console.log(`[INFO] HEX file saved to ${fileName}.`);
		console.log(dump);
		writeFileSync(fileName, dump, "utf-8");
		return dump;
	}
}

function assert(expr, str) {
	if (expr) return;
	if (!str) console.error(`[ERROR] Assertion Failed (${__function}:${__line}).`);
	else console.error(`[ERROR] Assertion Failed (${__function}:${__line}):\n[ERROR] ${str}.`);
	process.exit(1);
}

Object.defineProperty(global, "__stack", {
	get: function() {
		const func = Error.prepareStackTrace;
		Error.prepareStackTrace = (_, stack) => stack;
		const err = new Error();
		Error.captureStackTrace(err, arguments.callee);
		const stack = err.stack;
		Error.prepareStackTrace = func;
		return stack;
	}
});

Object.defineProperty(global, "__line", {
	get: () => {
		return __stack[2].getLineNumber();
	}
});

Object.defineProperty(global, "__function", {
	get: () => {
		return __stack[2].getFunctionName() || "anonymous";
	}
});

Number.prototype.hex = function () {
	return `0x${this.toString(16).toUpperCase()}`;
};

Number.prototype.intelHex = function (len=2) {
	return this.toString(16).padStart(len, "0").toUpperCase();
};

const DDRD = 0x0A;
const PORTD = 0x0B;
const asm = new Assembler();
asm.sbi(DDRD, 3);
asm.sbi(PORTD, 3);
asm.compileIntel("main.hex");