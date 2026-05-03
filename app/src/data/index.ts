import priorityTable from "../../../data/sr2/priority_table.json";
import metatypes    from "../../../data/sr2/metatypes.json";
import skills       from "../../../data/sr2/skills.json";
import spells       from "../../../data/sr2/spells.json";
import gear         from "../../../data/sr2/gear.json";
import cyberware    from "../../../data/sr2/cyberware.json";
import archetypes   from "../../../data/sr2/archetypes.json";

export const sr2 = {
  priorityTable,
  metatypes,
  skills,
  spells,
  gear,
  cyberware,
  archetypes,
} as const;
