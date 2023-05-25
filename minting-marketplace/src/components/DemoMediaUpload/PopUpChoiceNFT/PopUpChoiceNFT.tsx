//@ts-nocheck
import React, { useCallback, useEffect, useState } from 'react';
import Modal from 'react-modal';
import { useSelector } from 'react-redux';
import Swal from 'sweetalert2';

import { RootState } from '../../../ducks';
import { ColorStoreType } from '../../../ducks/colors/colorStore.types';
import { rFetch } from '../../../utils/rFetch';
import { OptionsType } from '../../common/commonTypes/InputSelectTypes.types';
import InputSelect from '../../common/InputSelect';
import { TChoiceAllOptions } from '../../creatorStudio/creatorStudio.types';
import { IAnalyticsPopUp } from '../types/DemoMediaUpload.types';

import './../UploadedListBox/AnalyticsPopUp/AnalyticsPopUp.css';

const PopUpChoiceNFT: React.FC<IAnalyticsPopUp> = ({
  index,
  setMediaList,
  mediaList,
  setUploadSuccess,
  titleOfContract,
  fileData,
  setMediaUploadedList,
  newUserStatus,
  collectionIndex,
  address
}) => {
  const [modalIsOpen, setModalIsOpen] = useState<boolean>(false);
  const [contract, setContract] = useState('null');
  const [product, setProduct] = useState('null');
  const [offer, setOffer] = useState('null');
  const { primaryColor, textColor } = useSelector<RootState, ColorStoreType>(
    (store) => store.colorStore
  );
  const { currentUserAddress } = useSelector<RootState, ContractsInitialType>(
    (store) => store.contractStore
  );

  const [contractData, setContractData] = useState({});
  const [categories, setCategories] = useState<OptionsType[]>([]);
  const [productOptions, setProductOptions] = useState();
  const [offersOptions, setOffersOptions] = useState();
  const [choiceAllOptions, setChoiceAllOptions] =
    useState<TChoiceAllOptions | null>(null);

  const selectCommonInfoNFT = {
    customClass: 'form-control rounded-rair',
    customCSS: {
      backgroundColor: `var(--${primaryColor}-80)`,
      color: textColor
    },
    optionCSS: {
      color: textColor
    },
    labelCSS: {
      color: `${primaryColor === 'rhyno' ? 'rgb(41, 41, 41)' : '#fff'}`,
      marginTop: 5,
      marginBottom: 5
    }
  };

  const customStyles = {
    overlay: {
      zIndex: '1'
    },
    content: {
      background: primaryColor === 'rhyno' ? '#F2F2F2' : '#383637',
      top: '50%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      marginRight: '-50%',
      transform: 'translate(-50%, -50%)',
      display: 'flex',
      flexDirection: 'column',
      alignContent: 'center',
      justifyContent: 'center',
      alignItems: 'center',
      flexWrap: 'wrap',
      fontFamily: 'Plus Jakarta Text',
      border: 'none',
      borderRadius: '16px',
      height: 'auto',
      width: 368
    }
  };

  const openModal = useCallback(() => {
    setModalIsOpen(true);
    // document.body.classList.add('no-scroll');
  }, [setModalIsOpen]);

  const closeModal = useCallback(() => {
    setModalIsOpen(false);
    if (choiceAllOptions === null) {
      setContract('None');
      setProduct('null');
      setOffer('null');
    }
    // document.body.classList.remove('no-scroll');
  }, [setModalIsOpen, choiceAllOptions]);

  const handleChoiceOffer = useCallback(async () => {
    if (offer && contract !== 'None') {
      const filteredOffers = offersOptions.filter((el) => el.value === offer);
      if (Array.isArray(mediaList)) {
        const newArray = mediaList;
        newArray[index].contractAddress = contract;
        newArray[index].productIndex = product;
        newArray[index].offer = filteredOffers;
        setMediaList(newArray);

        const wholeContract = {
          contract: contract,
          product: product,
          offer: filteredOffers
        };

        setChoiceAllOptions(wholeContract);
        setModalIsOpen(false);
        setUploadSuccess(null);
      } else {
        setUploadSuccess(true);
        let updatedVideo = {};
        if (offer === '-1') {
          updatedVideo = {
            contract: contract,
            product: product,
            demo: true
          };
        } else {
          updatedVideo = {
            contract: contract,
            product: product,
            offer: [offer],
            demo: false
          };
        }
        const request = await rFetch(
          `/api/media/update/${fileData._id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedVideo)
          },
          undefined,
          false
        );

        if (!request.success) {
          setMediaUploadedList({});
          setUploadSuccess(null);
          setModalIsOpen(false);
          if (
            request.message === 'Nothing to update' ||
            request.message === `"offer[0]" must be a string`
          ) {
            Swal.fire('Error', 'Nothing to update', 'error');
          } else {
            Swal.fire('Error', request.message, 'error');
          }
        }

        setMediaUploadedList({});
        setUploadSuccess(null);
        setModalIsOpen(false);
      }
    } else {
      const newArray = [...mediaList];
      newArray[index] = {
        ...newArray[index],
        contractAddress: undefined,
        productIndex: undefined,
        offer: undefined
      };
      setMediaList(newArray);
      setChoiceAllOptions(null);
      setUploadSuccess(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    contract,
    index,
    mediaList,
    offer,
    offersOptions,
    product,
    setMediaList,
    setMediaUploadedList,
    setUploadSuccess
  ]);

  const getProduct = useCallback(async () => {
    if (contract && contract !== 'None') {
      const arrProduct = contract
        ? Object.keys(contractData[contract].products).map((key) => {
            return {
              label: contractData[contract].products[key].name,
              value:
                contractData[contract].products[key].collectionIndexInContract
            };
          })
        : [];

      setProductOptions(
        [
          {
            label: 'None',
            value: 'None'
          }
        ].concat(arrProduct)
      );

      if (collectionIndex) {
        setProductOptions(arrProduct);
        setProduct(collectionIndex);
      }
    }
  }, [contract, contractData, collectionIndex]);

  const getFullContractData = useCallback(async () => {
    const request = await rFetch('/api/contracts/full?itemsPerPage=5');

    if (request.success) {
      const { success, contracts } = await rFetch(
        `/api/contracts/full?itemsPerPage=${request.totalNumber}`
      );

      let contractsFiltered = contracts.filter(
        (el) => el.user === currentUserAddress
      );

      if (address) {
        contractsFiltered = contractsFiltered.filter(
          (item) => item.contractAddress === address
        );
      }

      if (success) {
        const mapping = {};
        const options = [];
        if (contractsFiltered.length === 0) {
          contractsFiltered = contracts.filter(
            (el) =>
              el.contractAddress ===
              '0x571acc173f57c095f1f63b28f823f0f33128a6c4'
          );
        }
        contractsFiltered.forEach((item) => {
          const offerMapping = {};
          item.products.offers.forEach((offer) => {
            offerMapping[
              offer[item.diamond ? 'diamondRangeIndex' : 'offerIndex']
            ] = offer;
          });
          item.products.offers = offerMapping;

          if (mapping[item._id] !== undefined) {
            mapping[item._id].products[
              item.products.collectionIndexInContract
            ] = item.products;
          } else {
            const productMapping = {};
            productMapping[item.products.collectionIndexInContract] =
              item.products;
            item.products = productMapping;
            mapping[item._id] = item;
            options.push({
              label: `${item.title} (${
                item.external
                  ? 'External'
                  : item.diamond
                  ? 'Diamond'
                  : 'Classic'
              })`,
              value: item._id,
              blockSync: item.blockSync,
              blockView: item.blockView
            });
          }
        });

        setContractData(mapping);
        setCategories(
          [
            {
              label: 'None',
              value: 'None'
            }
          ].concat(options)
        );

        if (address) {
          setCategories(options);
          setContract(options[0].value);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getOffers = useCallback(async () => {
    const arrOfferOption =
      contract && contract !== 'None' && product !== 'None'
        ? Object.keys(contractData[contract].products[product].offers).map(
            (key) => {
              return {
                label:
                  contractData[contract].products[product].offers[key]
                    .offerName,
                value:
                  contractData[contract].products[product].offers[key][
                    contractData[contract].diamond
                      ? 'diamondRangeIndex'
                      : 'offerIndex'
                  ]
              };
            }
          )
        : [];

    // if (contract === '63bc60fe1f591bd493923c29') {
    //   setOffersOptions([
    //     {
    //       label: 'Unlocked(demo)',
    //       value: '-1'
    //     }
    //   ]);
    // } else {

    if (address && collectionIndex && !Array.isArray(mediaList)) {
      if (fileData.demo) {
        setOffer(-1);
      } else {
        setOffer(fileData.offer[0]);
      }
    }

    setOffersOptions(
      [
        {
          label: 'Unlocked(demo)',
          value: '-1'
        }
      ].concat(arrOfferOption)
    );
    // }
  }, [contract, contractData, product]);

  useEffect(() => {
    if (modalIsOpen) {
      getFullContractData();
    }
  }, [getFullContractData, modalIsOpen]);

  useEffect(() => {
    if (contract !== 'null') {
      setProduct('null');
      getProduct();
    }
  }, [contract, getProduct]);

  useEffect(() => {
    if (product !== 'null') {
      setOffer('null');
      getOffers();
    }
  }, [getOffers, product]);

  useEffect(() => {
    closeModal();
  }, [closeModal]);

  return (
    <>
      {newUserStatus ? (
        <div className="border-stimorol rounded-rair col-12">
          <div
            style={{
              ...selectCommonInfoNFT,
              backgroundColor: `var(--${primaryColor}-80)`,
              marginTop: 0,
              cursor: 'unset'
            }}
            className="form-control input-select-custom-style">
            <div
              style={{
                ...selectCommonInfoNFT,
                color: `${primaryColor === 'rhyno' ? '#000' : '#fff'}`,
                cursor: 'pointer',
                textAlign: 'left'
              }}>
              {titleOfContract
                ? titleOfContract.title
                : choiceAllOptions !== null
                ? choiceAllOptions.offer[0].label
                : 'Unlocked(demo)'}
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={openModal}
          className="border-stimorol rounded-rair col-12">
          <div
            style={{
              ...selectCommonInfoNFT,
              backgroundColor: `var(--${primaryColor}-80)`,
              marginTop: 0,
              cursor: 'pointer'
            }}
            className="form-control input-select-custom-style">
            <div
              style={{
                ...selectCommonInfoNFT,
                color: `${primaryColor === 'rhyno' ? '#000' : '#fff'}`,
                cursor: 'pointer',
                textAlign: 'left'
              }}>
              {titleOfContract
                ? titleOfContract.title
                : choiceAllOptions !== null
                ? choiceAllOptions.offer[0].label
                : 'Select a Contract'}
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={modalIsOpen}
        style={customStyles}
        onRequestClose={closeModal}
        contentLabel="Video Modal">
        {contractData && (
          <>
            <InputSelect
              customClass="form-control input-select-custom-style"
              label="Contract"
              getter={contract}
              setter={(e) => {
                setContract(e);
              }}
              placeholder="Select a Contract"
              options={categories}
              disabled={address ? true : false}
              {...selectCommonInfoNFT}
            />

            {contract !== 'null' && contract !== 'None' && (
              <InputSelect
                customClass="form-control input-select-custom-style nft-choice"
                label="Product"
                getter={product}
                setter={(e) => {
                  setProduct(e);
                }}
                placeholder="Select a Product"
                options={productOptions}
                disabled={collectionIndex ? true : false}
                {...selectCommonInfoNFT}
              />
            )}
            {product !== 'null' && product !== 'None' && (
              <>
                <InputSelect
                  customClass="form-control input-select-custom-style nft-choice"
                  label="Offer"
                  getter={offer}
                  setter={(e) => {
                    setOffer(e);
                  }}
                  placeholder="Select an Offer"
                  options={offersOptions}
                  {...selectCommonInfoNFT}
                />
              </>
            )}
            <button
              onClick={() => handleChoiceOffer()}
              disabled={offer === 'null' || offer === 'None'}
              style={{
                marginTop: 20
              }}
              className="col-12 btn-stimorol btn rounded-rair white">
              <>{titleOfContract ? 'Update' : 'Submit'}</>
            </button>
          </>
        )}
      </Modal>
    </>
  );
};

export default PopUpChoiceNFT;
