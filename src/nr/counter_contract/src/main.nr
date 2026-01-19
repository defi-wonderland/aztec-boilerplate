mod public_key_note;

use dep::aztec::macros::aztec;

#[aztec]
pub contract ConstantContract {
    // aztec library imports
    use dep::aztec::{
        macros::{functions::{external, initializer, noinitcheck}, storage::storage},
        messages::message_delivery::MessageDelivery,
        oracle::{
            capsules,
            get_contract_instance::get_contract_instance,
            notes::{get_sender_for_tags, set_sender_for_tags},
        },
        protocol_types::{
            address::AztecAddress,
            hash::poseidon2_hash,
            traits::{Deserialize, Serialize},
        },
        state_vars::SinglePrivateImmutable,
    };

    use crate::public_key_note::PublicKeyNote;

    // @param owner The address of the owner
    // @param counter A numerical value
    #[storage]
    struct Storage<Context> {
        signing_public_key: SinglePrivateImmutable<PublicKeyNote, Context>,
    }

    #[derive(Serialize, Eq, Deserialize)]
    pub struct Constants {
        signing_public_key: PublicKeyNote,
    }

    pub global CONSTANTS_SLOT: Field = 0x31415926535;

    impl Constants {
        fn init(address: AztecAddress) -> Constants {
            // Safety: this is checked against the committed value in the initialization hash
            let constants: Constants = unsafe { capsules::load(address, CONSTANTS_SLOT).unwrap() };

            let instance = get_contract_instance(address);
            let serialized_constants = constants.serialize();
            let constants_commitment = poseidon2_hash(serialized_constants);

            assert_eq(constants_commitment, instance.initialization_hash);

            constants
        }
    }

    // Constructs the contract
    #[external("private")]
    #[initializer]
    fn constructor(signing_pub_key_x: Field, signing_pub_key_y: Field) {
        let pub_key_note = PublicKeyNote { x: signing_pub_key_x, y: signing_pub_key_y };

        // Safety: The sender for tags is only used to compute unconstrained shared secrets for emitting logs.
        // Since this value is only used for unconstrained tagging and not for any constrained logic,
        // it is safe to load from an unconstrained context.
        let original_sender =
            unsafe { get_sender_for_tags().unwrap_or(self.context.msg_sender().unwrap()) };

        // We set the sender for tags to msg.sender to ensure tags are associated with the actual caller.
        // Safety: Comment from above applies here as well.
        unsafe { set_sender_for_tags(self.context.msg_sender().unwrap()) };

        self.storage.signing_public_key.initialize(pub_key_note).deliver(
            MessageDelivery.CONSTRAINED_ONCHAIN,
        );

        // Safety: Comment from above applies here as well.
        unsafe { set_sender_for_tags(original_sender) };
    }

    #[external("private")]
    fn do_nothing() {}

    #[external("private")]
    fn fetch_from_storage() {
        let storage = Storage::init(self.context);
        let public_key = storage.signing_public_key.get_note();
    }

    #[external("private")]
    #[noinitcheck]
    fn fetch_from_constants() {
        let constants = Constants::init(self.address);
        let public_key = constants.signing_public_key;
    }

    #[external("private")]
    #[noinitcheck]
    fn assert_fetched_values_are_correct(x: Field, y: Field) {
        let constants = Constants::init(self.address);
        let fetched_public_key = constants.signing_public_key;
        let actual_public_key = PublicKeyNote { x: x, y: y };
        assert_eq(actual_public_key, fetched_public_key);
    }
}
