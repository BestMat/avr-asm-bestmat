/*
 * BestMat AVR Assembly: AVR Assembly Compiler
 * Copyright (C) 2026 - Yuvanth B (BestMat) - All right reserved.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { writeFileSync } from "node:fs";

const MASK = 0x0F;

class Assembler {
	#ptr     = 0;
	#labels  = new Map();
	#patches = [];
	constructor(MEMORY = 1024) {
		// MEMORY: bytes
		this.buffer  = new ArrayBuffer(MEMORY);
		this.view    = new DataView(this.buffer);
		this.MEMORY  = MEMORY;
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
	cbi(regX, regY) {
		assert(Number.isInteger(regX) && 0 <= regX && regX <= 31, `regX (0 <= regX <= 31) must be between [0, 31] but got ${regX} instead`);
		assert(Number.isInteger(regY) && 0 <= regY && regY <= 7, `regY (0 <= regY <= 7) must be between [0, 7] but got ${regY} instead`);
		
		const high = 0x98;
		const low  = (regX << 3) | regY; // AAAA Abbb
		const byte = (high << 8) | low;
		this.#write(byte);
		const str              = `${high.hex()} ${low.hex()}`;
		const strLittleEndian  = `${low.hex()} ${high.hex()}`;

		console.log({ byte, str, strLittleEndian  });
		return { byte, str, strLittleEndian  };
	}
	label(name) {
		assert(!this.#labels.has(name), `Label with name ${name} has already been declared`);
		assert(typeof name === "string" && name.length >= 1, `Invalid label name ${name}. Label must be a string with length atleast 1`)
		this.#labels.set(name, this.#ptr);
	}
	rjmp(addr) {
		if (Number.isInteger(addr)) {
			assert(-2048 <= addr && addr <= 2047, `rjmp instruction address out of range. It must be between [-2048, 2047] but received ${addr} instead`);
			const high = 0xC000;
			// low = addr
			const byte = high | (addr & 0x0FFF);
			this.#write(byte);

			// const str             = `${high.hex()} ${addr.hex()}`;
			// const strLittleEndian = `${addr.hex()} ${high.hex()}`;

			// return { byte, str, strLittleEndian  };
		} else if (typeof addr === "string") {
			const opcode = 0xC000;
			const ptr = this.#write(opcode);
			this.#patches.push({
				label: addr,
				ptr
			});
		} else {
			// TODO
			assert(false);
		}
	}
	#fixAllPatches() {
		for (const { label, ptr } of this.#patches) {
			const addr = this.#labels.get(label);
			const cur  = ptr / 2;
			const tar  = addr / 2;
			const high = 0xC000;
			const low = tar - cur - 1;
			assert(-2048 <= low && low <= 2047, `rjmp instruction address out of range. It must be between [-2048, 2047] but received ${low} instead`);
			const byte = high | (low & 0x0FFF);
			this.view.setUint16(ptr, byte, true);
		}
		this.#patches = [];
	}
	compileIntel(fileName = "bestmat.hex", bytesPerLine = 16) {
		this.#fixAllPatches();
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

const DDRD  = 0x0A;
const PORTD = 0x0B;
const HIGH  = 0x01;
const LOW   = 0x00;
const asm = new Assembler();
function pinMode(pin, mode) {
	assert(mode === HIGH || mode === LOW, "Mode can either be HIGH (1) or LOW (0)");
	if (mode === HIGH)
		asm.sbi(DDRD, pin);
	else
		asm.cbi(DDRD, pin);
}
function digitalWrite(pin, value) {
	assert(value === HIGH || value === LOW, "Digital value can either be HIGH (1) or LOW (0)");
	if (mode === HIGH)
		asm.sbi(PORTD, pin);
	else
		asm.cbi(PORTD, pin)
}
asm.sbi(DDRD, 3);
asm.sbi(PORTD, 3);
asm.label("loop");
asm.rjmp("loop");
asm.compileIntel("main.hex");