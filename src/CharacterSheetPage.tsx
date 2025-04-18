import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Checkbox } from "primereact/checkbox";
import { Dropdown } from "primereact/dropdown";
import { Fragment } from "react/jsx-runtime";
import { abilities, attributes, Participant, skills } from "./utils";
import { useEffect, useState, useRef } from "react";
import { deleteCharacter, saveCharacter } from "./supabase";
import { Toast } from "primereact/toast";
import { Button } from "primereact/button";
import { ConfirmDialog } from "primereact/confirmdialog";
import { Tooltip } from "primereact/tooltip";

export default function CharacterSheetPage({
  loadedParticipant,
  editable,
  updateCharacterDisplay,
}: {
  loadedParticipant: Participant;
  editable: boolean;
  updateCharacterDisplay: (name: string, playerName: string) => void;
}) {
  const [participant, setParticipant] = useState<Participant>(loadedParticipant);
  const [isDirty, setIsDirty] = useState(false);
  const toast = useRef<Toast>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setParticipant(loadedParticipant);
    return () => {
      if (isDirty) {
        setIsDirty(false);
        saveCharacter(participant);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedParticipant]);

  useEffect(() => {
    if (!isDirty) return;

    const timeoutId = setTimeout(() => {
      saveCharacter(participant).then(() => {
        updateCharacterDisplay(participant.charsheet.name, participant.charsheet.playerName);
      });
      setIsDirty(false);
    }, 1000); // Delay the save

    return () => clearTimeout(timeoutId); // Clear the timer if `isDirty` changes again
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participant, isDirty]);

  function updateCharacter(value: (prev: any) => any) {
    if (!editable) return;
    const newParticipant = {
      ...participant,
      charsheet: value(participant.charsheet),
    };
    setParticipant(newParticipant);
    setIsDirty(true);
  }

  const handleAttributeChange = (attr: string, value: string) => {
    const numValue = value === "" ? 0 : Math.max(0, Math.min(3, parseInt(value)));
    updateCharacter((prev) => ({
      ...prev,
      attributes: {
        ...prev.attributes,
        [attr.toLowerCase()]: numValue,
      },
    }));
  };

  const toggleSkill = (skill: string) => {
    updateCharacter((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  const toggleAbility = (ability: string) => {
    let currentArmor = participant.charsheet.sumArmor;
    if (ability === "Kemény") {
      const changingTo = !participant.charsheet.abilities.includes(ability);
      currentArmor += changingTo ? 1 : -1;
    }

    updateCharacter((prev) => ({
      ...prev,
      sumArmor: currentArmor,
      abilities: prev.abilities.includes(ability)
        ? prev.abilities.filter((a) => a !== ability)
        : [...prev.abilities, ability],
    }));
  };

  const handleArmorTypeChange = (type: string, checked: boolean) => {
    if (!editable) return;
    const prevShield = participant.charsheet.shield ? 1 : 0;
    const shield = type === "Pajzs" && checked ? 1 : type !== "Pajzs" ? prevShield : 0;
    const abilityArmor = participant.charsheet.abilities.includes("Kemény") ? 1 : 0;

    const armor =
      type !== "Pajzs" && checked
        ? ["Nincs", "Könnyű", "Teljes"].indexOf(type)
        : ["Nincs", "Könnyű", "Teljes"].indexOf(participant.charsheet.armor);

    if (type === "Pajzs") {
      updateCharacter((prev) => ({
        ...prev,
        shield: checked,
        sumArmor: shield + armor + abilityArmor,
      }));
    } else {
      updateCharacter((prev) => ({
        ...prev,
        armor: checked ? type : prev.armor,
        sumArmor: shield + armor + abilityArmor,
      }));
    }
  };

  function handleClassChange(value: string) {
    if (!editable) return;
    const classSkills = {
      Harcos: ["Atlétika"],
      Tolvaj: ["Lopakodás"],
      Pap: ["Rejtélyfejtés", "Gyógyítás"],
      Varázsló: ["Mágiaismeret"],
      Kósza: ["Túlélés"],
    };
    (classSkills[value] ?? []).forEach((skill) => {
      if (!participant.charsheet.skills.includes(skill)) participant.charsheet.skills.push(skill);
    });
    updateCharacter((prev) => ({
      ...prev,
      class: value,
      skills: [...participant.charsheet.skills],
    }));
  }

  const handleDeleteCharacter = async () => {
    if (!editable) return;
    const success = await deleteCharacter(participant.id);
    if (success) {
      toast.current?.show({
        severity: "success",
        summary: "Siker",
        detail: "A karakter sikeresen törölve",
        life: 3000,
      });
    } else {
      toast.current?.show({
        severity: "error",
        summary: "Hiba",
        detail: "Nem sikerült törölni a karaktert",
        life: 3000,
      });
    }
  };

  return (
    <>
      <Toast ref={toast} />
      <div
        className='flex flex-column gap-4 p-4 mt-3 border-round-md'
        style={{ maxWidth: "1000px", margin: "auto", backgroundColor: "#1f2937" }}>
        {/* Top Fields */}
        <div className='flex gap-4'>
          <InputText
            placeholder='Név'
            className='flex-1 text-yellow-400'
            maxLength={50}
            value={participant.charsheet.name}
            onChange={(e) => updateCharacter((prev) => ({ ...prev, name: e.target.value }))}
          />
          <Dropdown
            placeholder='Kaszt'
            className='w-10rem text-yellow-400'
            value={participant.charsheet.class}
            options={["Harcos", "Tolvaj", "Pap", "Varázsló", "Kósza", "Egyedi"].map((value) => ({
              label: value,
              value,
            }))}
            onChange={(e) => handleClassChange(e.value)}
          />
          <InputText
            placeholder='Játékos'
            className='w-10rem text-yellow-400'
            value={participant.charsheet.playerName}
            maxLength={50}
            onChange={(e) => updateCharacter((prev) => ({ ...prev, playerName: e.target.value }))}
          />
          <div className='flex align-items-center gap-2'>
            <span>Szint</span>
            <InputText
              type='number'
              className='w-3rem text-center text-yellow-400'
              value={participant.charsheet.level?.toString() || ""}
              onChange={(e) =>
                updateCharacter((prev) => ({
                  ...prev,
                  level: e.target.value ? Math.min(10, Math.max(1, parseInt(e.target.value))) : 1,
                }))
              }
            />
          </div>
        </div>

        {/* Attributes */}
        <div className='flex justify-content-between gap-4'>
          <div className='flex justify-content-between flex-row w-4 flex-wrap align-content-start'>
            <div className='w-full text-center font-bold mb-3'>Tulajdonságok</div>

            {attributes.map((attr) => (
              <div key={attr.label} className='flex flex-row align-items-center w-6 mb-3'>
                <InputText
                  type='number'
                  className='w-4rem text-center p-inputtext-lg p-2 text-4xl text-yellow-400 font-bold'
                  value={
                    participant.charsheet.attributes[
                      attr.label.toLowerCase() as keyof typeof participant.charsheet.attributes
                    ]?.toString() || "0"
                  }
                  onChange={(e) => handleAttributeChange(attr.label.slice(0, 3), e.target.value)}
                />
                <span className='font-bold ml-2 text-3xl'>{attr.label}</span>
              </div>
            ))}
          </div>

          {/* Skills and Abilities */}
          <div className='flex w-3 flex-column'>
            <div className='w-full text-center font-bold mb-3'>Képzettségek</div>
            <div className='flex-1 border-1 border-round border-bluegray-700 p-3 justify-content-between flex flex-column'>
              {skills.map((skill) => (
                <div
                  key={skill}
                  className={`flex justify-content-between align-items-center ${
                    participant.charsheet.skills.includes(skill) ? "text-900" : "text-200"
                  }`}>
                  <span>{skill}</span>
                  <Checkbox
                    checked={participant.charsheet.skills.includes(skill)}
                    onChange={() => toggleSkill(skill)}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className='flex w-5 flex-column'>
            <div className='w-full text-center font-bold mb-3'>Különleges képességek</div>
            <div className='flex-1 border-1 border-round border-bluegray-700 p-3'>
              <div className='grid'>
                {abilities.map((ab, idx) => (
                  <Fragment key={ab.name}>
                    <div
                      id={`abaility-div-${idx}`}
                      className={`col-6 flex justify-content-between align-items-center p-1 ${
                        participant.charsheet.abilities.includes(ab.name) ? "text-900" : "text-200"
                      }`}>
                      <span>{ab.name}</span>
                      <Checkbox
                        checked={participant.charsheet.abilities.includes(ab.name)}
                        onChange={() => toggleAbility(ab.name)}
                      />
                    </div>
                    <Tooltip
                      target={`#abaility-div-${idx}`}
                      mouseTrack
                      position='bottom'
                      mouseTrackTop={20}>
                      {ab.description}
                    </Tooltip>
                    {(idx + 1) % 4 === 0 && idx !== abilities.length - 1 && (
                      <hr className='w-full text-bluegray-700' />
                    )}
                  </Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Weapons & Equipment */}
        <div className='flex gap-4'>
          <InputTextarea
            autoResize
            rows={5}
            spellCheck={false}
            placeholder='Fegyverek'
            className='flex-1 text-yellow-400'
            maxLength={1000}
            value={participant.charsheet.weapons}
            onChange={(e) => updateCharacter((prev) => ({ ...prev, weapons: e.target.value }))}
          />
          <InputTextarea
            autoResize
            rows={5}
            spellCheck={false}
            placeholder='Felszerelés'
            className='flex-1 text-yellow-400'
            maxLength={1000}
            value={participant.charsheet.gear}
            onChange={(e) => updateCharacter((prev) => ({ ...prev, gear: e.target.value }))}
          />
        </div>

        {/* Armor and HP */}
        <div className='flex flex-wrap align-items-center justify-content-between gap-4'>
          <div className='flex-1 flex flex-column'>
            <div className='w-full text-center font-bold mb-1'>Páncél és sebesség</div>
            <div className='flex flex-wrap align-items-center justify-content-between'>
              {["Nincs", "Könnyű", "Teljes", "Pajzs"].map((label, idx) => (
                <div key={label} className='flex align-items-center gap-2'>
                  <Checkbox
                    inputId={`arm_${idx}`}
                    checked={
                      label === "Pajzs"
                        ? participant.charsheet.shield
                        : participant.charsheet.armor === label
                    }
                    onChange={(e) => handleArmorTypeChange(label, e.checked)}
                  />
                  <label htmlFor={`arm_${idx}`}>{label}</label>
                </div>
              ))}
              <div className='flex align-items-center gap-2'>
                <span>Össz páncél</span>
                <InputText
                  style={{ borderRadius: "0 0 50% 50% / 0 0 100% 100%" }}
                  className='w-3rem text-center text-yellow-400'
                  value={participant.charsheet.sumArmor?.toString() || ""}
                  type='number'
                  onChange={(e) =>
                    updateCharacter((prev) => ({
                      ...prev,
                      sumArmor: e.target.value
                        ? Math.max(0, Math.min(10, parseInt(e.target.value)))
                        : 0,
                    }))
                  }
                />
              </div>
            </div>
          </div>
          <div className='flex flex-column w-3'>
            <div className='flex-1 flex text-center font-bold mb-1'>
              <div className='w-6 text-center font-bold'>HP kocka</div>
              <div className='w-6 text-center font-bold'>HP</div>
            </div>
            <div className='flex flex-1 justify-content-around'>
              <div className='flex align-items-center justify-content-between'>
                <InputText
                  className='w-6rem text-center text-yellow-400'
                  value={participant.charsheet.hpDice?.toString() || ""}
                  type='number'
                  onChange={(e) =>
                    updateCharacter((prev) => ({
                      ...prev,
                      hpDice: e.target.value
                        ? Math.max(1, Math.min(10, parseInt(e.target.value)))
                        : 0,
                    }))
                  }
                />
              </div>
              <div className='flex align-items-center gap-2'>
                <InputText
                  className='w-6rem text-center text-yellow-400'
                  value={participant.charsheet.hp?.toString() || ""}
                  type='number'
                  onChange={(e) =>
                    updateCharacter((prev) => ({
                      ...prev,
                      hp: e.target.value ? Math.max(0, Math.min(50, parseInt(e.target.value))) : 0,
                    }))
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className='flex gap-4'>
          <InputTextarea
            autoResize
            spellCheck={false}
            rows={3}
            placeholder='Jegyzetek'
            className='w-full text-yellow-400'
            maxLength={1000}
            value={participant.charsheet.notesLeft}
            onChange={(e) => updateCharacter((prev) => ({ ...prev, notesLeft: e.target.value }))}
          />
          <InputTextarea
            autoResize
            spellCheck={false}
            rows={3}
            placeholder='Jegyzetek'
            className='w-full text-yellow-400'
            maxLength={1000}
            value={participant.charsheet.notesRight}
            onChange={(e) => updateCharacter((prev) => ({ ...prev, notesRight: e.target.value }))}
          />
        </div>

        {/* Bottom */}
        <div className='flex gap-4'>
          <div className='flex align-items-center gap-2 flex-1 justify-content-center'>
            <span>Pénz</span>
            <InputText
              className='w-10rem text-center text-yellow-400'
              value={participant.charsheet.money}
              maxLength={50}
              onChange={(e) => updateCharacter((prev) => ({ ...prev, money: e.target.value }))}
            />
          </div>
          <div className='flex align-items-center gap-2 flex-1 justify-content-center'>
            <span>Köv. szint</span>
            <InputText
              className='w-6rem text-center text-yellow-400'
              value={participant.charsheet.nextLevel?.toString() || "0"}
              maxLength={5}
              type='number'
              onChange={(e) =>
                updateCharacter((prev) => ({
                  ...prev,
                  nextLevel: e.target.value ? parseInt(e.target.value) : 0,
                }))
              }
            />
          </div>
          <div className='flex align-items-center gap-2 flex-1 justify-content-center'>
            <span>XP</span>
            <InputText
              className='w-6rem text-center text-yellow-400'
              value={participant.charsheet.xp?.toString() || "0"}
              maxLength={5}
              type='number'
              onChange={(e) =>
                updateCharacter((prev) => ({
                  ...prev,
                  xp: e.target.value ? parseInt(e.target.value) : 0,
                }))
              }
            />
          </div>
        </div>
      </div>
      {editable && (
        <div
          className='flex mb-3 mt-1 justify-content-end'
          style={{ maxWidth: "1000px", margin: "auto" }}>
          <Button severity='danger' size='small' text onClick={() => setShowDeleteConfirm(true)}>
            Karakter törlése
          </Button>
        </div>
      )}
      <ConfirmDialog
        visible={showDeleteConfirm}
        onHide={() => setShowDeleteConfirm(false)}
        message='Biztosan törölni szeretnéd ezt a karaktert?'
        header='Megerősítés'
        icon='pi pi-exclamation-circle'
        accept={handleDeleteCharacter}
        acceptLabel='Igen'
        rejectLabel='Nem'
      />
    </>
  );
}
