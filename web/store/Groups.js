import { action, observable, toJS } from 'mobx';
import axios from 'axios';
import Router from 'next/router';
import { sha256 } from 'js-sha256';
import stringFromUTF8Array from './../utils/batostr';
const ReactMarkdown = require('react-markdown');

class GroupsStore {
    stores = null;
    constructor(stores) {
        this.stores = stores;
        // this.getList = this.getList.bind(this);
        this.decryptList = this.decryptList.bind(this);
    }

    @observable list = null;
    @observable current = null;
    // @observable getListStatus = 'init';
    @observable search = '';
    @observable lastTxId = null;

    @observable listDB = null;
    @observable namesDB = null;
    @observable fakeGroups = [0, 1, 2, 3, 4, 5, 6];

    @action
    initLevelDB() {
        const { alice } = this.stores;
        const levelup = require('levelup');
        const leveljs = require('level-js');

        if (alice.publicKey) {
            this.listDB = levelup(leveljs(`/root/.leveldb/list_groups_${alice.publicKey}`));
            this.namesDB = levelup(leveljs(`/root/.leveldb/list_groups_names_${alice.publicKey}`));
        }
    }

    @action
    createGroupHash(publicKeys) {
        const sorted = publicKeys.sort().join('');
        return sha256(sorted);
    }


    @action
    setGroup(group) {
        const { alice, cdms } = this.stores;
        this.current = group;
        Router.push(`/index?groupHash=${group.groupHash}`, `/gr/${group.groupHash}`);
        // return;
        // sessionStorage.setItem('groupHash', group.groupHash);
        // const groupsWithSameGroupHash = this.list.filter(el => el.groupHash === group.groupHash);
        // if (groupsWithSameGroupHash.length > 0) {
        //     const sameGroup = groupsWithSameGroupHash[0];
        //     this.current = sameGroup;
        //     this.setGroupFullName(sameGroup.fullName);
        // } else {
        //     this.current = group;
        //     this.setGroupFullName(group.fullName);
        // }

        // Router.push(`/index?groupHash=${group.groupHash}`, `/gr/${group.groupHash}`);
        // cdms.initLevelDB(alice.publicKey, group.groupHash);
        // cdms.getList();        
    }

    @action
    resetGroup() {
        this.current = null;
        this.search = '';
        Router.push('/');
        // cdms.list = null;
        // cdms.message = '';
    }

    @action
    readList() {
        const list = [];
        this.listDB.createReadStream()
            .on('data', data => {
                const k = parseInt(stringFromUTF8Array(data.key));
                const v = stringFromUTF8Array(data.value);
                list.push({
                    key: k,
                    value: JSON.parse(v)
                });
                // this.listDB.del(k);
            })
            .on('end', _ => {
                this.decryptList(list.map(el => el.value));
            });
    }


    @action
    saveList(list) {
        const records = [];
        this.listDB.createReadStream()
            .on('data', data => {
                const k = parseInt(stringFromUTF8Array(data.key));
                const v = stringFromUTF8Array(data.value);
                records.push({
                    key: k,
                    value: JSON.parse(v)
                });
            })
            .on('end', _ => {
                const operations = [];
                const newGroupHahses = list.map(el => el.groupHash);
                
                for (let i = 0; i < records.length; i += 1) {
                    if (newGroupHahses.indexOf(records[i].value.groupHash) > -1) {
                        operations.push({
                            type: 'del',
                            key: records[i].key
                        });
                    }
                }

                const initKey = records.length > 0 ? records[records.length - 1].key + 1 : 0
                for (let i = 0; i < list.length; i += 1) {
                    operations.push(
                        {
                            type: 'put',
                            key: i + initKey,
                            value: JSON.stringify(list[i])
                        },
                    );
                } 
                                
                this.listDB.batch(operations, err => {
                    if (err) return console.log('Batch insert error', err);
                    this.lastTxId = list[list.length - 1].lastCdm.txId;
                    this.readList();
                });
            });
    }

    @action
    decryptList(list) {
        const { crypto } = this.stores;
        const decList = [];
        const promises = [];
        for (let i = 0; i < list.length; i += 1) {
            if (list[i].lastCdm) {
                const p = crypto.decryptMessage(
                    list[i].lastCdm.message,
                    list[i].lastCdm.type === 'outgoing' ? list[i].lastCdm.recipient : list[i].lastCdm.logicalSender
                )
                .then(res => {
                    list[i].lastCdm.message = <ReactMarkdown source={res} skipHtml={true} />;
                    let msg = res;
                    msg = msg.replace(/[`*]/gm, '');
                    list[i].lastCdm.message = msg;
                    decList.push(list[i]);
                });
                promises.push(p);
            } else {
                decList.push(list[i]);
            }
        }

        Promise.all(promises)
            .then(_ => {
                if (decList.length > 0) {
                    this.lastTxId = decList[decList.length - 1].lastCdm.txId;
                }
                this.list = decList.reverse();
            })
            .catch(e => console.log(e));
    }
}

export default GroupsStore;
