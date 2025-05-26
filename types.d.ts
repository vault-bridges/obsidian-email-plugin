declare module 'mailauth' {
	function authenticate(
		input: string | Buffer,
		options: Options,
	): Promise<EmailAuthenticationResult>

	interface Options {
		sender?: string // Email address from the MAIL FROM command. Defaults to the Return-Path header if not set.
		ip?: string // IP address of the remote client that sent the message.
		helo?: string // Hostname from the HELO/EHLO command.
		trustReceived?: boolean // If true, parses ip and helo from the latest Received header if not provided. Defaults to false.
		mta?: string // Hostname of the server performing the authentication. Defaults to os.hostname(). Included in Authentication headers.
		minBitLength?: number // Minimum allowed bits for RSA public keys. Defaults to 1024. Keys with fewer bits will fail validation.
		disableArc?: boolean // If true, skips ARC checks.
		disableDmarc?: boolean // If true, skips DMARC checks, also disabling dependent checks like BIMI.
		disableBimi?: boolean // If true, skips BIMI checks.
		seal?: object // Options for ARC sealing if the message doesn't have a broken ARC chain.
		signingDomain?: string // ARC key domain name.
		selector?: string // ARC key selector.
		privateKey?: string | Buffer // Private key for signing (RSA or Ed25519).
		resolver?: (name: string, rr: string) => Promise<unknown> // Custom DNS resolver function. Defaults to dns.promises.resolve.
		maxResolveCount?: number // DNS lookup limit for SPF. Defaults to 10 as per RFC7208.
		maxVoidCount?: number // DNS lookup limit for SPF producing empty results. Defaults to 2 as per RFC7208.
	}

	interface EmailAuthenticationResult {
		dkim: DKIM
		spf: SPF
		dmarc: DMARC
		arc: ARC
		bimi: BIMI
		headers: string
	}

	interface DKIM {
		headerFrom: string[]
		envelopeFrom: string | boolean
		results: DKIMResult[]
	}

	interface DKIMResult {
		signingDomain: string
		selector: string
		signature: string
		algo: string
		format: string
		bodyHash: string
		bodyHashExpecting: string
		status: DKIMStatus
		publicKey: string
		info: string
	}

	interface DKIMStatus {
		result: string
		comment?: boolean
		header: DKIMHeader
		policy?: Record<string, unknown>
		aligned: string | boolean
	}

	interface DKIMHeader {
		i: string
		s: string
		a: string
		b: string
	}

	interface SPF {
		domain: string
		'client-ip': string
		helo: string
		'envelope-from': string
		status: SPFStatus
		header: string
		info: string
	}

	interface SPFStatus {
		result: string
		comment: string
		smtp: SPFSMTP
	}

	interface SPFSMTP {
		mailfrom: string
		helo: string
	}

	interface DMARC {
		status: DMARCStatus
		domain: string
		policy: string
		p: string
		sp: string
		info: string
	}

	interface DMARCStatus {
		result: string
		comment: string
		header: DMARCHeader
	}

	interface DMARCHeader {
		from: string
	}

	interface ARC {
		status: ARCStatus
		i: number
		signature: ARCSignature
		authenticationResults: ARCResults
		info: string
		authResults: string
	}

	interface ARCStatus {
		result: string
		comment: string | boolean
	}

	interface ARCSignature {
		signingDomain: string
		selector: string
		signature: string
		algo: string
		format: string
		bodyHash: string
		bodyHashExpecting: string
		status: ARCStatus // Reusing ARCStatus as it matches the structure
		publicKey: string
	}

	interface ARCResults {
		[key: string]: ARCResult | ARCDKIM[] | SPF // key is the domain, e.g., "mx.google.com"
	}

	interface ARCResult {
		value: string
	}

	interface ARCDKIM {
		header: DKIMHeader
		result: string
	}

	interface BIMI {
		status: BIMIStatus
		location: string
		info: string
	}

	interface BIMIStatus {
		header: BIMIHeader
		result: string
	}

	interface BIMIHeader {
		selector: string
		d: string
	}
}
