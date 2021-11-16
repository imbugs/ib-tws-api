import _ from 'lodash';

const dupData = {};

const contain = (list = new Set(), object) => {
    for (const item of list) {
        if (_.isEqual(item, object)) {
            return true;
        }
    }
    return false;
}

const duplicate = (type, data, timeout = 1000) => {
    if (type && data) {
        data = _.cloneDeep(data);
        if (!dupData[type]) {
            dupData[type] = new Set();
        }
        if (contain(dupData[type], data)) {
            return true;
        } else {
            dupData[type].add(data);
            setTimeout(() => {
                dupData[type].delete(data);
            }, timeout);
            return false;
        }
    }
}

export default duplicate;