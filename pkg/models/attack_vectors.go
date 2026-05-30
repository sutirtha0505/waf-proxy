package models

var AttackVectors = map[string]int{
	"sqli_classic":             1,
	"sqli_blind_boolean":       2,
	"sqli_blind_time":          3,
	"sqli_error_based":         4,
	"sqli_union":               5,
	"sqli_out_of_band":         6,
	"xss_reflected":            7,
	"xss_stored":               8,
	"xss_dom":                  9,
	"xss_mutation":             10,
	"cmdi":                     11,
	"cmdi_blind":               12,
	"ssti":                     13,
	"ldap_injection":           14,
	"xml_injection":            15,
	"http_header_injection":    16,
	"lfi":                      17,
	"path_traversal":           18,
	"rfi":                      19,
	"ssrf":                     20,
	"csrf":                     21,
	"open_redirect":            22,
	"brute_force":              23,
	"session_hijacking":        24,
	"jwt_manipulation":         25,
	"rce":                      26,
	"xxe":                      27,
	"insecure_deserialization": 28,
	"http_request_smuggling":   29,
	"business_logic_abuse":     30,
	"http_flood":               31,
	"slowloris":                32,
	"redos":                    33,
	"evasion_encoding":         34,
	"evasion_case_whitespace":  35,
	"evasion_null_byte":        36,
	"http_parameter_pollution": 37,
}

func NextAvailableCode(vectors map[string]int) int {
	max := 0
	for _, code := range vectors {
		if code > max {
			max = code
		}
	}
	return max + 1
}

func Validate(name string) bool {
	_, ok := AttackVectors[name]
	return ok || name == "safe" || name == "normal"
}
