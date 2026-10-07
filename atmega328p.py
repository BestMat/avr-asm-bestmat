#!/opt/homebrew/bin/python3
# Nagapillaiyar Sai

# build script

hexCode = ""

"""
sbi: set bit in I/O register
Refer to page 116 of AVR Instruction Set Manual 
"""
def sbi(regA, regB):
	global hexCode
	code = []
	code.append("9A")
	code.append(hex(regA)[2:])
	code.append(hex(regB)[2:])
	codeStr = " ".join(code)
	hexCode += codeStr
	return codeStr


DDRD = 0x0A
PORTD = 0x0B

sbi(DDRD, 3)
sbi(PORTD, 3)

print(hexCode)