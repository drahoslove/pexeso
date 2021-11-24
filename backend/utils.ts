// utilis:
import { randomBytes, createHash } from 'crypto'

export function randomToken(n: number) {
	const chars = 'abcdefghijklmnopqrstuvwxyz234567'
	const result = new Array(n)
	const randomBites = randomBytes(n)
	for (let i = 0, cursor = 0; i < n; i++) {
		cursor += randomBites[i]
		result[i] = chars[cursor % chars.length]
	}
	return result.join('')
}

export const md5 = (txt: string) => createHash('md5').update(txt).digest('hex')

export const rand = (n: number) => Math.floor(Math.random()*n)
