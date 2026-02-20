//
//  STBleManager.h
//  RunmefitSDKDemo
//
//  Created by 星迈 on 2021/11/19.
//

#import <Foundation/Foundation.h>

#import <RunmefitSDK/RunmefitSDK.h>
#import "STDeviceModel.h"

NS_ASSUME_NONNULL_BEGIN

@interface STBleManager : NSObject

@property(nonatomic,assign) BOOL stateOn;///系统蓝牙开关

@property(nonatomic,copy) void(^updateState)(BOOL state);
@property(nonatomic,strong) CBCentralManager *centralManager;

@property (nonatomic,strong) NSMutableArray<STDeviceModel*> *deviceModels;
@property(nonatomic,copy) void(^updatePerpheral)(NSArray<STDeviceModel*> *deviceModels);

@property(nonatomic,strong) STDeviceModel *actDeviceModel;
@property(nonatomic,strong) CBCharacteristic *writeCharacter;

@property(nonatomic,copy) void(^updateConnect)(BOOL connect);

+(instancetype)sharedInstance;

-(void)startScan;
-(void)stopScan;

-(void)connectPerpheral:(STDeviceModel *)deviceModel;
-(void)cancelPeripheral:(STDeviceModel *)deviceModel;

-(void)writeCommand:(NSData *)data;

@end

NS_ASSUME_NONNULL_END
