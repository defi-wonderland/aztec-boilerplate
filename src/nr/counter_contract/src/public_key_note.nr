use dep::aztec::{macros::notes::note, protocol_types::traits::{Deserialize, Packable, Serialize}};

// Stores a public key composed of two fields
#[derive(Eq, Packable, Serialize, Deserialize)]
#[note]
pub struct PublicKeyNote {
    pub x: Field,
    pub y: Field,
}
