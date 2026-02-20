//
//  MainTableViewController.h
//  RunmefitSDKDemo
//
//  Created by 星迈 on 2021/11/22.
//

#import <UIKit/UIKit.h>

#import "PerperalsTableViewController.h"
#import "MBProgressHUD.h"

NS_ASSUME_NONNULL_BEGIN

@interface MainTableViewController : UITableViewController

@property (nonatomic,strong) MBProgressHUD *_Nullable progressHUD;

//MARK: 文件传输
@property (assign, nonatomic) NSUInteger blockReadInterval;///设备接收buf大小

@property (strong, nonatomic) NSString *version;
@property (strong, nonatomic) NSString *uiVersion;
@property (strong, nonatomic) NSString *nameModel;

@property (strong, nonatomic) NSData *_Nullable localData;///源数据

- (void)addLog:(NSString *)str;

@end

NS_ASSUME_NONNULL_END
