//
//  STDeviceModel.h
//  RunmefitSDKDemo
//
//  Created by 星迈 on 2021/11/20.
//

#import <Foundation/Foundation.h>

#import <CoreBluetooth/CoreBluetooth.h>

NS_ASSUME_NONNULL_BEGIN

@interface STDeviceModel : NSObject

@property(nonatomic,strong) CBPeripheral *peripheral;

@property(nonatomic,strong) NSString *name;
@property(nonatomic,strong) NSString *mac;
@property(nonatomic,strong) NSNumber *rssi;

@end

NS_ASSUME_NONNULL_END
