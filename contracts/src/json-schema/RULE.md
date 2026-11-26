# The tester's forms are published as JSON Schema too, made from the same forms and never edited by hand.

Each file here is written by `npm run json-schema --workspace=@repo/host-contracts` from the tester's forms, and the
contract's tests fail when a file differs from what its form gives. To change one, change its form, then run the
command.
