import Index from './Index';
import Alice from './Alice';
import Groups from './Groups';
import Cdms from './Cdms';
import Utils from './Utils';
import Crypto from './Crypto';
import Wrapper from './Wrapper';
import Contacts from './Contacts';
import Login from './Login';
import Heartbeat from './Heartbeat';

const stores = {};

stores.alice = new Alice(stores);
stores.groups = new Groups(stores);
stores.utils = new Utils(stores);
stores.crypto = new Crypto(stores);
stores.wrapper = new Wrapper(stores);
stores.index = new Index(stores);
stores.cdms = new Cdms(stores);
stores.contacts = new Contacts(stores);
stores.login = new Login(stores);
stores.heartbeat = new Heartbeat(stores);

export default stores;
