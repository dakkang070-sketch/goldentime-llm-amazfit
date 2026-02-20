//
//  AppDelegate.h
//  RunmefitSDKDemo
//
//  Created by 星迈 on 2021/11/19.
//

#import <UIKit/UIKit.h>

@interface AppDelegate : UIResponder <UIApplicationDelegate>

@property (strong, nonatomic) UIWindow *window;

+ (AppDelegate *)shareInstance;

//MARK: 提示
- (void)alertShowTitle:(NSString *)title message:(NSString *)message;

@end

