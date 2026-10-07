;.device ATmega328P
.include "m328Pdef.inc"

;.org 0x0000
	;sbi DDRD, 3 ; pinMode
	; 0x0a

main:
	sbi DDRD, 3 ; pinMode
	; 0x0a
	sbi PORTD, 3 ; digitalWrite
	; 0x0b

loop:
	rjmp loop

; /dev/cu.usbmodem1101
;avra try.asm && avrdude -c arduino -p m328p -P /dev/cu.usbmodem1101 -b 115200 -U flash:w:try.hex:i


; PORTB: 8-13
; PORTC: A0-A5
; PORTD: 0-7

; 0x53 0x9A 0x5B 0x9A
; 83 154: 39,507

; sbi DDRD, 3: 0x9A 0x53 (flip LE)
; sbi: 0x9A = 1001 1010
; A (DDRD): 0x0A = 01010 (pad = 5)
; B (pin3): 0x03 = 011
; AAAA Abbb: 0101 0011 = 0x53

; sbi PORTD, 3
; sbi: 0x9A
; A (PORTD): 0x0B = 01011
; B (pin 3): 0x03 = 011
; AAAA Abbb: 0101 1011 = 0x5B
; 0x9A 0x5B

; avrdude -c arduino -p m328p -P /dev/cu.usbmodem1101 -b 115200 -U flash:w:main.hex:i 