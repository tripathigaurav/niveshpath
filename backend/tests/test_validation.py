"""Tests for input validation helpers."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app import validate_symbol, _SCHEME_CODE_RE


class TestValidateSymbol:
    def test_valid_simple(self):
        sym, err = validate_symbol("TCS")
        assert sym == "TCS"
        assert err is None

    def test_valid_with_dot(self):
        sym, err = validate_symbol("TCS.NS")
        assert sym == "TCS.NS"
        assert err is None

    def test_valid_with_caret(self):
        sym, err = validate_symbol("^NSEI")
        assert sym == "^NSEI"
        assert err is None

    def test_lowercase_normalised(self):
        sym, err = validate_symbol("reliance")
        assert sym == "RELIANCE"

    def test_reject_empty(self):
        sym, err = validate_symbol("")
        assert sym is None
        assert "Invalid" in err

    def test_reject_special_chars(self):
        sym, err = validate_symbol("TCS;DROP TABLE")
        assert sym is None

    def test_reject_too_long(self):
        sym, err = validate_symbol("A" * 25)
        assert sym is None

    def test_whitespace_trimmed(self):
        sym, err = validate_symbol("  INFY  ")
        assert sym == "INFY"


class TestSchemeCodeRegex:
    def test_valid_codes(self):
        for code in ["100", "119551", "1"]:
            assert _SCHEME_CODE_RE.match(code), f"{code} should match"

    def test_reject_alpha(self):
        assert not _SCHEME_CODE_RE.match("abc")

    def test_reject_empty(self):
        assert not _SCHEME_CODE_RE.match("")

    def test_too_long(self):
        assert not _SCHEME_CODE_RE.match("12345678901")
