import { action, observable } from 'mobx';
import axios from 'axios';
import * as WavesAPI from 'waves-api';

class WrapperStore {
    stores = null;
    constructor(stores) {
        this.stores = stores;
    }

    @observable defaultSelectedKeys = 'cdms';
}

export default WrapperStore;

