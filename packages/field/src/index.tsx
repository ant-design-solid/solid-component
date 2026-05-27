import FieldClear from "./FieldClear";
import FieldCounter from "./FieldCounter";
import FieldInput from "./FieldInput";
import FieldRoot from "./FieldRoot";
import FieldTextArea from "./FieldTextArea";

function Field() {}

export default Object.assign(Field, {
  Root: FieldRoot,
  Input: FieldInput,
  TextArea: FieldTextArea,
  Clear: FieldClear,
  Counter: FieldCounter,
});
