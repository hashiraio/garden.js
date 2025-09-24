import React from 'react';
import {
  CancelIcon,
  KeyboardDownIcon,
  RadioCheckedIcon,
  Typography,
} from '@gardenfi/garden-book';
import { useState, FC } from 'react';
import {
  OrderProgress,
  SimplifiedOrderStatus,
} from '../../hooks/useOrderStatus';

type OrderStatusProps = {
  orderProgress: OrderProgress | undefined;
  viewableStatus?: string | null;
  confirmationString: string;
};

export const OrderStatus: FC<OrderStatusProps> = ({
  orderProgress,
  viewableStatus,
  confirmationString,
}) => {
  const [dropdown, setDropdown] = useState(false);

  const handleDropdown = () => {
    setDropdown(!dropdown);
  };

  const NoOfSteps = orderProgress ? Object.values(orderProgress).length : 0;

  const completedSteps =
    orderProgress &&
    Object.values(orderProgress).filter(
      (step) =>
        step.status === 'completed' ||
        step.status === 'inProgress' ||
        step.status === 'cancel',
    ).length;

  const currentStatus =
    (orderProgress &&
      Object.values(orderProgress).find(
        (_, index, array) =>
          index === array.length - 1 || array[index + 1].status === 'pending',
      )?.title) ||
    '';

  return (
    <div className="flex flex-col justify-between rounded-2xl bg-white p-4">
      {currentStatus ? (
        <>
          <div
            onClick={handleDropdown}
            className={`flex flex-col gap-2 ${
              !viewableStatus && 'cursor-pointer'
            } `}
          >
            <div className="flex items-center justify-between">
              <Typography size="h5" weight="medium">
                Order status
              </Typography>
              <div
                className={`transform transition-transform duration-300 ${
                  dropdown ? 'rotate-180' : 'rotate-0'
                }`}
              >
                <KeyboardDownIcon />
              </div>
            </div>
          </div>

          <div
            className={`transition-all duration-300 ease-in-out ${
              dropdown ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <ul className="mt-2">
              {orderProgress &&
                Object.values(orderProgress).map((step, index) => (
                  <li
                    key={index}
                    className={`relative mx-1 flex items-center gap-1 ${
                      index !== NoOfSteps - 1 ? 'pb-4' : ''
                    }`}
                  >
                    {index !== NoOfSteps - 1 &&
                      Object.values(orderProgress)[index + 1].status !==
                        'pending' && (
                        <span
                          className="absolute top-2 z-10 h-full border-l-[1px] border-dark-grey"
                          style={{
                            height: 'calc(100% + 4px)',
                            borderImage:
                              Object.values(orderProgress)[index + 1].status ===
                              'inProgress'
                                ? 'linear-gradient(to bottom, #554B6A, #e36492) 1'
                                : '',
                          }}
                        />
                      )}
                    {step.status === 'completed' && (
                      <span className="relative z-20 flex h-2 w-2 flex-shrink-0 -translate-x-[3.5px] items-center justify-center rounded-full border border-dark-grey bg-white">
                        <RadioCheckedIcon className="absolute h-2 w-2" />
                      </span>
                    )}
                    {step.status === 'inProgress' && (
                      <div className="z-20 h-2 w-2 -translate-x-[3.5px] rounded-full bg-rose" />
                    )}
                    {step.status === 'pending' && (
                      <div className="h-2 w-2 -translate-x-[3.5px] rounded-full border-[1px] border-dark-grey" />
                    )}
                    {step.status === 'cancel' && (
                      <span className="relative z-20 flex h-2 w-2 flex-shrink-0 -translate-x-[3.5px] items-center justify-center rounded-full border border-error-red bg-white">
                        <CancelIcon className="absolute h-2 w-2" />
                      </span>
                    )}
                    <div className="flex w-full items-center justify-between">
                      <Typography
                        size="h4"
                        weight={
                          currentStatus === step.title ? 'medium' : 'regular'
                        }
                      >
                        {step.title}
                      </Typography>
                      {index === 1 && step.status === 'inProgress' && (
                        <Typography size="h5" weight="regular">
                          {confirmationString}
                        </Typography>
                      )}
                    </div>
                  </li>
                ))}
            </ul>
          </div>
          <div
            className={`overflow-hidden ${
              !dropdown ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
            }`}
            style={{
              transition: dropdown
                ? 'max-height 50ms ease-in-out, opacity 300ms ease-in-out'
                : 'max-height 300ms ease-in-out 200ms, opacity 300ms ease-in-out',
            }}
          >
            <div className="mt-2 flex items-center justify-between">
              {currentStatus === SimplifiedOrderStatus.depositDetected ? (
                <div className="flex gap-3">
                  <Typography size="h3" weight="medium" className="!leading-5">
                    {currentStatus}
                  </Typography>
                  <Typography size="h3" weight="medium" className="my-auto">
                    {confirmationString}
                  </Typography>
                </div>
              ) : (
                <Typography size="h3" weight="medium" className="!leading-5">
                  {currentStatus}
                </Typography>
              )}
              {orderProgress && (
                <Typography size="h5" weight="medium" className="my-auto">
                  {completedSteps} of {NoOfSteps}
                </Typography>
              )}
            </div>
          </div>
        </>
      ) : viewableStatus ? (
        <Typography size="h3" weight="medium">
          {viewableStatus}
        </Typography>
      ) : (
        <></>
      )}
    </div>
  );
};
