var db = require('../etl-db');

function getOncMeds(request, medsFormat, encounterId) {
    let queryParts = {};
    var patientUuid = request.uuid;
    var programUuid = request.programUuid;
    if (medsFormat == 'summary') {
        queryParts = {
            columns: "t1.value_coded",
            table: "amrs.obs",
            where: ["t2.uuid = ? and t1.concept_id in ? and t1.encounter_id = ? and t1.voided = ?", patientUuid, [9918], encounterId, 0],
            order: [{
                column: 't1.obs_group_id',
                asc: false
            }],
            joins: [
                ['amrs.person', 't2', 't2.person_id=t1.person_id'],
            ],
            offset: request.startIndex,
            limit: request.limit
        };
    } else {
        queryParts = {
            columns: "t1.concept_id, t1.value_coded, t1.value_numeric, t1.obs_group_id, t1.encounter_id, t1.obs_datetime",
            table: "amrs.obs",
            where: ["t2.uuid = ? and t5.programuuid = ? and t1.concept_id in ? and t1.voided = ?", patientUuid, programUuid, [9918, 8723, 1896, 7463, 1899, 9869], 0],
            order: [{
                column: 't1.obs_group_id',
                asc: false
            }],
            joins: [
                ['amrs.person', 't2', 't2.person_id=t1.person_id'],
                ['amrs.patient_program', 't3', 't3.patient_id=t2.person_id']
            ],
            leftOuterJoins: [
                ['(SELECT program_id, uuid as `programuuid` FROM amrs.program ) `t5` ON (t3.program_id = t5.program_id)']
            ],
            offset: request.startIndex,
            limit: request.limit
        };
    }

    return db.queryDb(queryParts)
}

function generateMedsDataSet(data) {
    let meds = [];
    const groupBy = key => array =>
        array.reduce((objectsByKeyValue, obj) => {
            const value = obj[key];
            objectsByKeyValue[value] = (objectsByKeyValue[value] || []).concat(obj);
            return objectsByKeyValue;
        }, {});
    //Group medical history obs by the group
    if (data) {
        const groupByEncounter = groupBy('encounter_id');
        const encounterData = groupByEncounter(data);
        _.each(encounterData, function (concepts) {
            let oncMeds = {};
            const i = groupBy('obs_group_id');
            let plan = _.filter(concepts, function (o) {
                return o.concept_id === 9869
            });
            oncMeds.treatment_plan = plan;
            _.remove(concepts, function (e) {
                return e.obs_group_id == null;
            });
            let drug;
            drug = i(concepts);
            if (!_.isEmpty(drug)) {
                oncMeds.drugs = drug;
                meds.push(oncMeds);
            }
        })
    }
    return meds;
}

function getPatientOncologyDiagnosis(request) {
    let patientUuid = request.uuid;
    let queryParts = {
        columns: "*",
        order: [{
            column: 'encounter_id',
            asc: false
        }],
        joins: [
            ['amrs.person', 't2', 't2.person_id=t1.person_id']
        ],
        table: "amrs.obs",
        where: ["t2.uuid = ? and t1.concept_id in ? and t1.voided = ?", patientUuid, [9841, 9871, 6536, 9844, 6551, 9846, 6540, 9843], 0],
        offset: request.startIndex,
        limit: request.limit
    };
    return db.queryDb(queryParts);
}

export {generateMedsDataSet, getOncMeds, getPatientOncologyDiagnosis}
