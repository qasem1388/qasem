//! Exact monetary amounts.
//!
//! Amounts are held as an integer number of the currency's minor unit
//! (هللة for SAR, 1 riyal = 100 halalas). Floating point is never used.
//! At the boundary amounts travel as decimal strings ("1250.50") and are
//! parsed with `rust_decimal`, rejecting anything that is not exactly
//! representable in two decimal places.

use std::fmt;
use std::str::FromStr;

use rust_decimal::Decimal;
use serde::{Deserialize, Deserializer, Serialize, Serializer};

/// ISO 4217 code of the base currency. Internal bookkeeping is in SAR.
pub const BASE_CURRENCY: &str = "SAR";
pub const MINOR_UNITS: u32 = 2;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Default)]
pub struct Money(i64);

#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum MoneyError {
    #[error("صيغة المبلغ غير صحيحة")]
    InvalidFormat,
    #[error("المبلغ يحتوي على أكثر من خانتين عشريتين")]
    TooManyDecimals,
    #[error("المبلغ خارج النطاق المسموح")]
    OutOfRange,
}

impl Money {
    pub const ZERO: Money = Money(0);

    pub const fn from_minor(minor: i64) -> Self {
        Money(minor)
    }

    pub const fn minor(self) -> i64 {
        self.0
    }

    pub fn from_decimal(d: Decimal) -> Result<Self, MoneyError> {
        let normalized = d.normalize();
        if normalized.scale() > MINOR_UNITS {
            return Err(MoneyError::TooManyDecimals);
        }
        let minor = (normalized * Decimal::from(10i64.pow(MINOR_UNITS)))
            .trunc()
            .to_string()
            .parse::<i64>()
            .map_err(|_| MoneyError::OutOfRange)?;
        Ok(Money(minor))
    }

    pub fn to_decimal(self) -> Decimal {
        Decimal::new(self.0, MINOR_UNITS)
    }

    pub fn is_zero(self) -> bool {
        self.0 == 0
    }

    pub fn is_negative(self) -> bool {
        self.0 < 0
    }

    pub fn checked_add(self, other: Money) -> Option<Money> {
        self.0.checked_add(other.0).map(Money)
    }

    pub fn checked_sub(self, other: Money) -> Option<Money> {
        self.0.checked_sub(other.0).map(Money)
    }
}

impl FromStr for Money {
    type Err = MoneyError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let trimmed = s.trim();
        // Only plain ASCII decimal notation: no exponents, separators or signs other than '-'.
        let valid = !trimmed.is_empty()
            && trimmed.char_indices().all(|(i, c)| c.is_ascii_digit() || c == '.' || (c == '-' && i == 0))
            && trimmed.matches('.').count() <= 1;
        if !valid {
            return Err(MoneyError::InvalidFormat);
        }
        let d = Decimal::from_str(trimmed).map_err(|_| MoneyError::InvalidFormat)?;
        Money::from_decimal(d)
    }
}

impl fmt::Display for Money {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:.2}", self.to_decimal())
    }
}

impl Serialize for Money {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(&self.to_string())
    }
}

impl<'de> Deserialize<'de> for Money {
    fn deserialize<D: Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
        let s = String::deserialize(d)?;
        s.parse().map_err(serde::de::Error::custom)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_exact_amounts() {
        assert_eq!("1250.50".parse::<Money>().unwrap().minor(), 125_050);
        assert_eq!("0.01".parse::<Money>().unwrap().minor(), 1);
        assert_eq!("7".parse::<Money>().unwrap().minor(), 700);
        assert_eq!("-3.5".parse::<Money>().unwrap().minor(), -350);
        assert_eq!("10.500".parse::<Money>().unwrap().minor(), 1_050); // trailing zero is exact
    }

    #[test]
    fn rejects_inexact_or_malformed() {
        assert_eq!("0.001".parse::<Money>(), Err(MoneyError::TooManyDecimals));
        assert_eq!("1e3".parse::<Money>(), Err(MoneyError::InvalidFormat));
        assert_eq!("1,000".parse::<Money>(), Err(MoneyError::InvalidFormat));
        assert_eq!("".parse::<Money>(), Err(MoneyError::InvalidFormat));
        assert_eq!("1.2.3".parse::<Money>(), Err(MoneyError::InvalidFormat));
        assert_eq!("99999999999999999999".parse::<Money>(), Err(MoneyError::OutOfRange));
    }

    #[test]
    fn no_float_drift() {
        // 0.1 + 0.2 must be exactly 0.3
        let a: Money = "0.1".parse().unwrap();
        let b: Money = "0.2".parse().unwrap();
        assert_eq!(a.checked_add(b).unwrap(), "0.3".parse().unwrap());
        assert_eq!(a.checked_add(b).unwrap().to_string(), "0.30");
    }

    #[test]
    fn serde_roundtrip_as_string() {
        let m: Money = "42.05".parse().unwrap();
        let json = serde_json::to_string(&m).unwrap();
        assert_eq!(json, "\"42.05\"");
        assert_eq!(serde_json::from_str::<Money>(&json).unwrap(), m);
    }
}
